// ── network.js — Connection info & live monitoring ─────────────────────
const Network = (() => {
  function getInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      type:        conn ? (conn.type || 'unknown') : 'unknown',
      effectiveType: conn ? (conn.effectiveType || '—') : '—',
      downlink:    conn ? conn.downlink : null,
      rtt:         conn ? conn.rtt : null,
      saveData:    conn ? conn.saveData : null,
      online:      navigator.onLine,
    };
  }

  function getDisplayType(info) {
    const t = info.type.toLowerCase();
    if (t === 'wifi' || t === 'wimax') return 'wifi';
    if (['cellular','2g','3g','4g','5g'].includes(t)) return 'cellular';
    if (!info.online) return 'offline';
    return 'wifi'; // assume wifi if browser doesn't report
  }

  function updateStatusBadge() {
    const badge = document.getElementById('conn-type');
    if (!badge) return;
    const info = getInfo();
    const type = getDisplayType(info);

    badge.className = 'conn-badge ' + type;

    const icons = {
      wifi: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`,
      cellular: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="14" width="3" height="7"/><rect x="7" y="10" width="3" height="11"/><rect x="12" y="6" width="3" height="15"/><rect x="17" y="2" width="3" height="19"/></svg>`,
      offline: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`,
    };

    const labels = {
      wifi: 'Wi-Fi',
      cellular: info.effectiveType !== '—' ? info.effectiveType.toUpperCase() : 'Cellular',
      offline: 'Offline',
    };

    badge.innerHTML = `${icons[type]} ${labels[type]}`;
  }

  function updateInfoPanel() {
    const info = getInfo();
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const type = getDisplayType(info);
    const typeLabels = { wifi: 'Wi-Fi', cellular: 'Cellular', offline: 'Offline', unknown: '—' };
    set('info-type',   typeLabels[type] || '—');
    set('info-eff',    info.effectiveType || '—');
    set('info-dl',     info.downlink != null ? `${info.downlink} Mbps` : '—');
    set('info-rtt',    info.rtt     != null ? `${info.rtt} ms`    : '—');
    set('info-save',   info.saveData != null ? (info.saveData ? 'On' : 'Off') : '—');
    set('info-online', info.online ? '✓ Yes' : '✗ No');
  }

  function init() {
    updateStatusBadge();
    updateInfoPanel();
    window.addEventListener('online',  () => { updateStatusBadge(); updateInfoPanel(); });
    window.addEventListener('offline', () => { updateStatusBadge(); updateInfoPanel(); });
    const conn = navigator.connection;
    if (conn) conn.addEventListener('change', () => { updateStatusBadge(); updateInfoPanel(); });
  }

  return { init, getInfo, getDisplayType, updateStatusBadge, updateInfoPanel };
})();
