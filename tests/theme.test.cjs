const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('system appearance changes propagate, but explicit choices stay fixed', async () => {
  let storageListener;
  let systemListener;
  const media = { matches: false, addEventListener(event, listener) { systemListener = listener; } };
  const context = vm.createContext({
    window: { matchMedia: () => media },
    chrome: { storage: {
      local: { get: async () => ({ theme: 'system' }) },
      onChanged: { addListener(listener) { storageListener = listener; } },
    } },
  });
  vm.runInContext(fs.readFileSync('src/shared/theme.js', 'utf8') + '\nglobalThis.api = ThemeController;', context);
  const rendered = [];
  await context.api.watch(preference => rendered.push(context.api.resolve(preference)));
  assert.deepEqual(rendered, ['light']);
  media.matches = true;
  systemListener();
  assert.deepEqual(rendered, ['light', 'dark']);
  storageListener({ theme: { newValue: 'light' } }, 'local');
  systemListener();
  assert.deepEqual(rendered, ['light', 'dark', 'light']);
  storageListener({ theme: { newValue: 'system' } }, 'local');
  assert.equal(rendered.at(-1), 'dark');
});

test('popup and dashboard resolve system mode and describe the next toggle action', () => {
  for (const surface of ['popup', 'dashboard']) {
    const source = fs.readFileSync(`src/${surface}/${surface}.js`, 'utf8');
    const apply = source.slice(source.indexOf('function applyTheme('), source.indexOf('async function toggleTheme('));
    const attrs = {};
    const button = { setAttribute(name, value) { attrs[name] = value; } };
    const context = vm.createContext({
      ThemeController: { resolve: () => 'light' },
      document: { documentElement: { setAttribute(name, value) { attrs[name] = value; } } },
      btnTheme: button, btnThemeDash: button,
      themeIconSun: null, themeIconMoon: null, themeIconSunDash: null, themeIconMoonDash: null,
      themeDashLabel: null, settingsThemeSelect: null,
    });
    vm.runInContext(apply, context);
    context.applyTheme('system');
    assert.equal(attrs['data-theme'], 'light');
    assert.equal(attrs['aria-label'], 'Switch to dark mode');
  }
});
