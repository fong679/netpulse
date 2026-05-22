// ── storage.js — LocalStorage wrapper ──────────────────────────────────
const Storage = (() => {
  const KEY = 'netpulse_history';
  const MAX = 50;

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function save(record) {
    const enabled = document.getElementById('toggle-storage');
    if (enabled && !enabled.checked) return;
    const all = getAll();
    all.unshift({ ...record, id: Date.now() });
    if (all.length > MAX) all.pop();
    localStorage.setItem(KEY, JSON.stringify(all));
    updateStorageCount();
  }

  function clear() {
    localStorage.removeItem(KEY);
    updateStorageCount();
  }

  function updateStorageCount() {
    const el = document.getElementById('storage-count');
    if (el) el.textContent = `${getAll().length} records`;
  }

  return { getAll, save, clear, updateStorageCount };
})();
