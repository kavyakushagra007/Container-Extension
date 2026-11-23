// One theme preference shared by the popup, dashboard, and system appearance.
const ThemeController = (() => {
  function resolve(preference, darkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return preference === 'system' ? (darkSystem ? 'dark' : 'light') : preference === 'light' ? 'light' : 'dark';
  }

  async function watch(render) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    let preference = 'dark';
    let changedWhileLoading = false;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.theme) return;
      changedWhileLoading = true;
      preference = changes.theme.newValue || 'dark';
      render(preference);
    });
    media.addEventListener('change', () => {
      if (preference === 'system') render(preference);
    });
    const stored = await chrome.storage.local.get('theme');
    if (!changedWhileLoading) preference = stored.theme || 'dark';
    render(preference);
    return preference;
  }

  return { resolve, watch };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ThemeController;
