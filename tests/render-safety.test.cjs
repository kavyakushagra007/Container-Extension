const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function declaration(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const remainder = source.slice(start);
  const next = remainder.slice(1).search(/\n(?:async )?function /);
  return next < 0 ? remainder : remainder.slice(0, next + 1);
}
for (const [file, functions] of [
  ['src/popup/popup.js', ['createMemoryHTML', 'createSpotlightCardHTML']],
  ['src/dashboard/dashboard.js', ['createDashMemoryCardHTML', 'createDashSpotlightHTML']],
]) {
  test(`${file}: stored quotes and markup cannot create inline handlers`, () => {
    const source = fs.readFileSync(file, 'utf8');
    const context = vm.createContext({
      allItems: [], searchQuery: '', activePreviewMemoryId: null,
      chrome: { runtime: { getURL: path => `chrome-extension://test/${path}` } },
      getTimeAgo: () => 'now',
    });
    vm.runInContext(declaration(source, 'escapeHTML'), context);
    context.getContextSnippet = mem => ({ snippetHTML: context.escapeHTML(mem.textContent), matchBadge: null });
    context.highlightMatches = text => context.escapeHTML(text);
    const attack = '" onerror="alert(1)" onclick="alert(1)';
    const record = { id: attack, url: 'https://example.com/' + attack, title: '<img src=x onerror="alert(1)">', domain: attack, textContent: attack, visitedAt: 1, visitCount: 1 };
    for (const name of functions) {
      vm.runInContext(declaration(source, name), context);
      const html = context[name](record, { promptText: attack, timeRange: null }, false);
      assert.doesNotMatch(html, /\son(?:error|click)="/i);
      assert.doesNotMatch(html, /<img src=x/i);
      assert.ok(html.includes('data-id="&quot; onerror=&quot;'));
    }
    assert.equal(context.escapeHTML(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  });
}
