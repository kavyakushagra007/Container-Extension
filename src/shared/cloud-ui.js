const CloudSyncUI = (() => {
  function errorMessage(message = '') {
    if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(message)) return 'The email or password is incorrect. Please try again.';
    if (/EMAIL_EXISTS/.test(message)) return 'An account already uses this email. Choose Log In to continue.';
    if (/WEAK_PASSWORD/.test(message)) return 'Choose a password with at least six characters.';
    if (/TOO_MANY_ATTEMPTS/.test(message)) return 'Too many attempts. Please wait a moment before trying again.';
    if (/403|PERMISSION_DENIED/.test(message)) return 'Cloud access was denied. Your local saves are still available.';
    if (/401|TOKEN_EXPIRED/.test(message)) return 'Your session has expired. Sign out and sign in again.';
    return 'Could not connect to cloud sync. Check your connection and try again. Your local saves are still available.';
  }
  function feedback(message, state = 'info') {
    const element = document.getElementById('cloud-feedback');
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state;
    element.classList.toggle('hidden', !message);
  }
  async function render() {
    const { authUser, cloudSyncStatus } = await chrome.storage.local.get(['authUser', 'cloudSyncStatus']);
    const status = authUser && cloudSyncStatus?.uid === authUser.uid ? cloudSyncStatus : {};
    const label = document.getElementById('auth-sync-status');
    const busy = status.state === 'syncing';
    label.dataset.state = status.state || 'idle';
    label.textContent = busy ? 'Syncing your library…' : status.state === 'success' ? 'Your library is up to date' : status.state === 'error' ? 'Sync needs attention' : 'Signed in · ready to sync';
    document.getElementById('cloud-last-sync').textContent = status.lastSuccess
      ? `Last synced ${new Date(status.lastSuccess).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
      : 'No successful sync yet';
    const button = document.getElementById('btn-sync-now');
    button.disabled = busy;
    button.textContent = busy ? 'Syncing…' : status.state === 'error' ? 'Retry sync' : 'Sync now';
    document.getElementById('btn-logout').disabled = busy;
    if (status.state === 'error') feedback(errorMessage(status.message), 'error');
    else if (status.state === 'success' || busy) feedback('');
    const toolbar = document.getElementById('dash-auth-label');
    if (toolbar) toolbar.textContent = busy ? 'Syncing…' : status.state === 'error' ? 'Retry sync' : 'Cloud Sync';
  }
  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('auth-modal');
    const close = () => {
      modal.classList.add('hidden');
      document.getElementById('auth-password-input').value = '';
      (document.getElementById('btn-auth') || document.getElementById('btn-dash-auth'))?.focus();
    };
    document.getElementById('cloud-close').addEventListener('click', close);
    modal.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        const controls = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')]
          .filter(element => element.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key === 'Enter' && event.target.matches('input')) {
        event.preventDefault();
        document.getElementById('auth-submit-btn').click();
      }
    });
    const opener = document.getElementById('btn-auth') || document.getElementById('btn-dash-auth');
    opener?.addEventListener('click', () => {
      queueMicrotask(() => { document.getElementById('cloud-close').focus(); render(); });
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.authUser || changes.cloudSyncStatus)) render();
    });
    render();
  });
  return { feedback, errorMessage, refresh: render };
})();
