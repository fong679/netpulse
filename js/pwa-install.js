// ── pwa-install.js — Smart install prompt ──────────────────────────────
const PWAInstall = (() => {
  let deferredPrompt = null;
  let installShown   = false;

  function init() {
    // Capture the beforeinstallprompt event ASAP
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;

      // Only show once per session, only if not already installed
      if (!installShown && !isInstalled()) {
        installShown = true;
        setTimeout(() => showBanner(), 1800); // after splash clears
      }
    });

    window.addEventListener('appinstalled', () => {
      hideBanner();
      deferredPrompt = null;
      showSnack('NetPulse installed successfully!');
    });
  }

  function isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  function showBanner() {
    if (isInstalled()) return;
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.add('show');
    }
  }

  function hideBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('show');
  }

  async function triggerInstall() {
    if (!deferredPrompt) return;
    hideBanner();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'dismissed') {
      // Don't re-show this session
    }
  }

  function showSnack(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  return { init, triggerInstall, hideBanner, isInstalled };
})();
