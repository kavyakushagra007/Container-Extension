const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const PageText = require('../src/services/page-text.js');

function element(tag, children = [], options = {}) {
  const node = { nodeType: 1, tagName: tag.toUpperCase(), getAttribute: name => options[name], ...options };
  const nodes = children.map(child => typeof child === 'string' ? { nodeType: 3, nodeValue: child } : child);
  nodes.forEach((child, i) => { child.previousSibling = nodes[i - 1] || null; });
  node.lastChild = nodes.at(-1) || null;
  return node;
}
const style = node => node.style || {};

function memoryDatabase() {
  const records = [];
  const request = work => {
    const result = {};
    queueMicrotask(() => { result.result = work(); result.onsuccess?.({ target: result }); });
    return result;
  };
  const cursor = range => {
    const result = {};
    const selected = records.filter(record => !range || (record.visitedAt >= range.start && record.visitedAt <= range.end)).slice().reverse();
    let offset = 0;
    const next = () => queueMicrotask(() => result.onsuccess?.({ target: { result: offset < selected.length ? {
      value: selected[offset++], continue: next,
    } : null } }));
    next();
    return result;
  };
  const store = {
    index(name) { return { openCursor: cursor, getAll: value => request(() => records.filter(record => record[name] === value)) }; },
    openCursor: cursor,
    put(record) { return request(() => {
      const index = records.findIndex(old => old.id === record.id);
      if (index === -1) records.push(record); else records[index] = record;
      return record.id;
    }); },
  };
  const context = vm.createContext({
    console, Date, URL, URLSearchParams, TextEncoder,
    indexedDB: { open: () => request(() => ({ transaction: () => ({ objectStore: () => store }) })) },
    IDBKeyRange: { bound: (start, end) => ({ start, end }) },
  });
  vm.runInContext(fs.readFileSync('src/services/memory-store.js', 'utf8') + '\nglobalThis.api = MemoryStore;', context);
  return { api: context.api, records };
}

test('extracts words deep in the body while excluding private and hidden elements', () => {
  const body = element('body', [
    element('p', ['intro '.repeat(1000)]),
    element('p', ['A rare term: mitochondria.']),
    element('form', [element('input', ['private form'])]),
    element('div', ['private draft'], { isContentEditable: true }),
    element('div', ['secret hidden'], { style: { display: 'none' } }),
    element('div', ['secret aria'], { 'aria-hidden': 'true' }),
    element('script', ['secret script']),
    element('nav', ['irrelevant links']),
  ]);
  const result = PageText.extract(body, style);
  assert.ok(result.indexOf('mitochondria') > 4500);
  assert.doesNotMatch(result, /private|secret|irrelevant/);
});

test('capture is bounded for very large pages', () => {
  const text = PageText.extract(element('body', ['x'.repeat(300000)]), style);
  assert.equal(text.length, PageText.MAX_CHARACTERS);
});

test('body-only matches work in ordinary and time-aware search and return deep text', async () => {
  const { api } = memoryDatabase();
  await api.saveMemory({ url: 'https://example.com/article', title: 'Biology', textContent: 'intro '.repeat(1000) + 'mitochondria', captureId: 'first' });
  assert.equal((await api.searchMemories('mitochondria'))[0].title, 'Biology');
  const result = await api.queryMemoriesByTimeAndKeywords({ keywords: ['mitochondria'], timeRange: { start: Date.now() - 10000, end: Date.now() + 10000 } });
  assert.equal(result.items.length, 1);
  assert.ok(result.items[0].textContent.indexOf('mitochondria') > 4500);
  assert.equal((await api.searchMemories('absentword')).length, 0);
});

test('refreshing loaded text does not inflate visit counts', async () => {
  const { api } = memoryDatabase();
  const payload = { url: 'https://example.com/article', title: 'Biology', captureId: 'first' };
  await api.saveMemory({ ...payload, textContent: 'loading' });
  await api.saveMemory({ ...payload, textContent: 'mitochondria' });
  let result = await api.searchMemories('mitochondria');
  assert.equal(result.length, 1);
  assert.equal(result[0].visitCount, 1);
  await api.saveMemory({ ...payload, captureId: 'second', textContent: 'mitochondria' });
  result = await api.searchMemories('mitochondria');
  assert.equal(result[0].visitCount, 2);
});

test('body matches outrank frequently visited URL-only matches', async () => {
  const { api, records } = memoryDatabase();
  await api.saveMemory({ url: 'https://example.com/body', title: 'Research', textContent: 'mitochondria' });
  await api.saveMemory({ url: 'https://example.com/mitochondria', title: 'Other page', textContent: '' });
  records[1].visitCount = 500;
  assert.equal((await api.searchMemories('mitochondria', 1))[0].title, 'Research');
  assert.ok((await api.getStats()).approxBytes > 0);
});

test('content script captures delayed text and avoids identical repeated writes', async () => {
  const { api } = memoryDatabase();
  let writes = 0;
  let mutate;
  let tick;
  let initial;
  let onMessage;
  const events = {};
  const document = {
    title: 'Research', visibilityState: 'visible', documentElement: {},
    body: element('body', ['loading']), querySelector: () => null,
    querySelectorAll: () => [], addEventListener(name, callback) { events[name] = callback; },
  };
  const window = { location: { href: 'https://example.com/article', hostname: 'example.com', protocol: 'https:' }, addEventListener() {} };
  window.top = window;
  const context = vm.createContext({
    document, window, PageText: { extract: root => PageText.extract(root, style) },
    chrome: {
      runtime: { id: 'test', onMessage: { addListener(callback) { onMessage = callback; } }, async sendMessage(message) {
        writes++;
        return { success: true, record: await api.saveMemory(message.payload) };
      } },
      storage: { local: { get: async () => ({}) }, onChanged: { addListener() {} } },
    },
    MutationObserver: class { constructor(callback) { mutate = callback; } observe() {} disconnect() {} },
    setTimeout(callback) { initial = callback; }, clearTimeout() {}, setInterval(callback) { tick = callback; }, clearInterval() {},
    console,
  });
  vm.runInContext(fs.readFileSync('src/content/content.js', 'utf8'), context);
  await initial();
  document.body = element('body', ['intro '.repeat(1000), element('p', ['mitochondria'])]);
  mutate(); tick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await api.searchMemories('mitochondria')).length, 1);
  mutate(); tick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes, 2);

  // A generated answer arrives just before the user opens the popup.
  document.body = element('body', [element('form', [
    element('p', ['Pythagorean triplets include 3, 4, and 5.']),
    element('textarea', ['private draft']),
  ])]);
  await new Promise(resolve => onMessage({ action: 'captureWebMemoryNow' }, {}, resolve));
  assert.equal((await api.searchMemories('triplets')).length, 1);
  assert.equal((await api.searchMemories('private draft')).length, 0);

  // More output arrives immediately before switching to the dashboard.
  document.body = element('body', [element('p', ['Additional triplets include 5, 12, 13.'])]);
  document.visibilityState = 'hidden';
  events.visibilitychange();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await api.searchMemories('Additional triplets')).length, 1);
});

for (const [file, nextFunction] of [
  ['src/popup/popup.js', 'createSpotlightCardHTML'],
  ['src/dashboard/dashboard.js', 'showPreview'],
]) {
  test(`${file}: shows and safely highlights the deep body passage`, () => {
    const source = fs.readFileSync(file, 'utf8');
    const functions = source.slice(source.indexOf('function escapeRegex('), source.indexOf(`function ${nextFunction}(`));
    const context = vm.createContext({
      NLPParser: require('../src/services/nlp-parser.js'),
      escapeHTML: text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    });
    vm.runInContext(functions, context);
    const result = context.getContextSnippet({ title: 'Biology', textContent: 'can '.repeat(1000) + '<script> mitochondria are inside cells' }, 'Can you find me mitochondria?');
    assert.match(result.matchBadge, /In Page Body/);
    assert.match(result.snippetHTML, /<mark class="search-match">mitochondria<\/mark>/);
    assert.doesNotMatch(result.snippetHTML, /<script>/);
    assert.match(result.snippetHTML, /&lt;script&gt;/);
  });
}

test('extracts generated text from nested shadow roots and slots without reading drafts', () => {
  const slotted = element('p', ['Pythagorean triplets include 3, 4, 5.']);
  const slot = element('slot', [], { assignedNodes: () => [slotted] });
  const fragment = element('fragment', [slot, element('textarea', ['private draft'])]);
  fragment.nodeType = 11;
  const host = element('chat-response', ['duplicate light text'], { shadowRoot: fragment });
  const body = element('body', [element('form', [host])]);
  const text = PageText.extract(body, style);
  assert.match(text, /triplets/);
  assert.doesNotMatch(text, /private|duplicate/);
});

test('popup and dashboard templates contain no inline event handlers', () => {
  for (const file of ['src/popup/popup.html', 'src/popup/popup.js', 'src/dashboard/dashboard.html', 'src/dashboard/dashboard.js']) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /<[^>]+\son[a-z]+\s*=/i, file);
  }
});
