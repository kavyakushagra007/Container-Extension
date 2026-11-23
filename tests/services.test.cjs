const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parser = require('../src/services/nlp-parser.js');

function service(initial = {}, fetch = async () => { throw new Error('Unexpected network request'); }) {
  let state = structuredClone(initial);
  const context = vm.createContext({
    console, Date, Map, Set, Promise, JSON, encodeURIComponent, fetch,
    importScripts() {},
    chrome: { storage: { local: {
      async get(keys) { return Object.fromEntries(keys.filter(key => key in state).map(key => [key, structuredClone(state[key])])); },
      async set(data) { Object.assign(state, structuredClone(data)); },
    } } },
  });
  vm.runInContext(fs.readFileSync('src/services/sync.js', 'utf8') + '\nglobalThis.service = SyncService;', context);
  return { api: context.service, state: () => state };
}
const item = (id, updatedAt, content = id) => ({ id, createdAt: 1, updatedAt, content });

test('latest edit wins regardless of creation time', () => {
  const { api } = service();
  const merged = api.mergeStates({ items: [item('a', 2)] }, { items: [item('a', 3, 'edited')] });
  assert.equal(merged.items[0].content, 'edited');
});
test('deletions survive a stale profile; an intentional newer restore wins', () => {
  const { api } = service();
  assert.equal(api.mergeStates({ deletedItems: { a: 10 } }, { items: [item('a', 5)] }).items.length, 0);
  assert.equal(api.mergeStates({ deletedItems: { a: 10 } }, { items: [item('a', 11)] }).items.length, 1);
});
test('local edits receive timestamps and deleted records receive markers', async () => {
  const { api, state } = service({ items: [item('a', 2), item('b', 2)] });
  await api.saveLocal({ items: [item('a', 2, 'edited')] });
  assert.ok(state().items[0].updatedAt > 2);
  assert.ok(state().deletedItems.b > 2);
  const timestamp = state().items[0].updatedAt;
  await api.saveLocal({ items: [item('a', 2, 'edited')] });
  assert.equal(state().items[0].updatedAt, timestamp);
});
test('sync retries concurrent cloud changes and preserves both profiles', async () => {
  let reads = 0, writes = 0;
  const mockFetch = async (url, options) => {
    if (options.method === 'PATCH') {
      writes++;
      assert.match(url, /currentDocument.updateTime=/);
      if (writes === 1) return { ok: false, status: 409 };
      const fields = JSON.parse(options.body).fields;
      assert.deepEqual(JSON.parse(fields.itemsJson.stringValue).map(i => i.id).sort(), ['a', 'b', 'c']);
      return { ok: true, status: 200 };
    }
    reads++;
    return { ok: true, status: 200, json: async () => ({ updateTime: `version-${reads}`, fields: {
      itemsJson: { stringValue: JSON.stringify(reads === 1 ? [item('b', 2)] : [item('b', 2), item('c', 3)]) },
    } }) };
  };
  const { api, state } = service({ items: [item('a', 2)], authUser: { uid: 'test' }, authToken: 'test', authExpiresAt: Date.now() + 1000000 }, mockFetch);
  await api.syncNow();
  assert.equal(writes, 2);
  assert.equal(state().items.length, 3);
  assert.equal(state().cloudSyncStatus.state, "success");
  assert.ok(state().cloudSyncStatus.lastSuccess > 0);
});
test('failed cloud reads never overwrite local data', async () => {
  const { api, state } = service({ items: [item('a', 2)], authUser: { uid: 'test' }, authToken: 'test', authExpiresAt: Date.now() + 1000000 }, async () => ({ ok: false, status: 403 }));
  await assert.rejects(api.syncNow(), /403/);
  assert.equal(state().items[0].id, 'a');
  assert.equal(state().cloudSyncStatus.state, 'error');
  assert.equal(state().cloudSyncStatus.lastSuccess, null);
});
test('signed-out sync performs no network requests', async () => {
  assert.equal(await service().api.syncNow(), null);
});
test('yesterday excludes today and retains search keywords', () => {
  const parsed = parser.parseQuery('Can you find me black Nike shoes yesterday?');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  assert.equal(parsed.timeRange.end, today.getTime() - 1);
  assert.deepEqual(parsed.cleanKeywords, ['black', 'nike', 'shoes']);
});
test('last week is Monday through Sunday', () => {
  const range = parser.parseQuery('last week').timeRange;
  assert.equal(new Date(range.start).getDay(), 1);
  assert.equal(new Date(range.end).getDay(), 0);
  assert.equal(new Date(range.start).getHours(), 0);
  assert.equal(new Date(range.end).getHours(), 23);
});
test('zero days ago means today and time-only questions have no filler keywords', () => {
  const parsed = parser.parseQuery('show me 0 days ago');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  assert.equal(parsed.timeRange.start, today.getTime());
  assert.deepEqual(parsed.cleanKeywords, []);
});
test('this morning ends at noon, rather than including the whole day', () => {
  const range = parser.parseQuery('this morning').timeRange;
  assert.equal(new Date(range.end + 1).getHours(), 12);
});
test('stale dashboard edits preserve unseen saves and newer unchanged records', async () => {
  const baseItems = [item('a', 2), item('b', 2)];
  const { api, state } = service({ items: [item('a', 2), item('b', 5, 'new edit'), item('c', 3)] });
  await api.saveLocal({ baseItems, items: [item('a', 2, 'dashboard edit'), item('b', 2)] });
  assert.equal(state().items.find(i => i.id === 'a').content, 'dashboard edit');
  assert.equal(state().items.find(i => i.id === 'b').content, 'new edit');
  assert.ok(state().items.some(i => i.id === 'c'));
  assert.equal(state().deletedItems.c, undefined);
  assert.equal(state().baseItems, undefined);
});
test('stale dashboard does not resurrect a record deleted elsewhere', async () => {
  const baseItems = [item('a', 2), item('b', 2)];
  const { api, state } = service({ items: [item('a', 2)], deletedItems: { b: 5 } });
  await api.saveLocal({ baseItems, items: [item('a', 2, 'edited'), item('b', 2)] });
  assert.equal(state().items.length, 1);
  assert.equal(state().deletedItems.b, 5);
});
