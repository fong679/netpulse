// ── app.js — Main application controller ───────────────────────────────
(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────
  let isTesting   = false;
  let dlHistory   = Array(12).fill(0);
  let ulHistory   = Array(12).fill(0);
  let deferredInstall = null;

  // ── Splash → App ──────────────────────────────────────────────────────
  function showApp() {
    const splash = document.getElementById('splash');
    const app    = document.getElementById('app');
    if (!splash || !app) return;
    if (app._ready) return; // prevent double-call
    app._ready = true;
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      app.classList.remove('hidden');
      onAppReady();
    }, 500);
  }

  // Show app after 1.8s, or immediately when page loads — whichever is first
  const splashTimer = setTimeout(showApp, 1800);

  if (document.readyState === 'complete') {
    clearTimeout(splashTimer);
    setTimeout(showApp, 1200);
  } else {
    window.addEventListener('load', () => {
      clearTimeout(splashTimer);
      setTimeout(showApp, 1200);
    });
    // Hard fallback — never stay stuck
    setTimeout(showApp, 3500);
  }

  function onAppReady() {
    Network.init();
    PWAInstall.init();
    Diagnostics.renderChecks();
    renderHistoryPage();
    Storage.updateStorageCount();
    startClock();
    bindNav();
    bindRunBtn();
    bindDiagBtn();
    bindClearHistory();
    bindInstall();
    bindSettings();
    addRippleEffects();
  }

  // ── Clock ─────────────────────────────────────────────────────────────
  function startClock() {
    const el = document.getElementById('live-time');
    const tick = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2,'0');
      const m = now.getMinutes().toString().padStart(2,'0');
      if (el) el.textContent = `${h}:${m}`;
    };
    tick();
    setInterval(tick, 10000);
  }

  // ── Navigation ────────────────────────────────────────────────────────
  let netInfoLoaded = false;
  let navLocked = false; // prevent double-tap during transition

  function bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {

      // Use pointerdown for instant Android-native response
      btn.addEventListener('pointerdown', e => {
        spawnNavRipple(btn, e);
      });

      btn.addEventListener('click', () => {
        if (navLocked) return;
        const page = btn.dataset.page;

        // Already on this page — do nothing
        if (btn.classList.contains('active')) return;

        navLocked = true;
        setTimeout(() => navLocked = false, 300);

        // Swap active class
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Transition pages
        const current = document.querySelector('.page.active');
        const target  = document.getElementById(`page-${page}`);
        if (current) current.classList.remove('active');
        if (target)  {
          // Small RAF delay so CSS transition fires properly
          requestAnimationFrame(() => {
            target.classList.add('active');
          });
          if (page === 'history') renderHistoryPage();
          if (page === 'netinfo' && !netInfoLoaded) {
            netInfoLoaded = true;
            NetInfo.init();
          }
        }
      });
    });
  }

  function spawnNavRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'nav-ripple';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // ── Speed Test ────────────────────────────────────────────────────────
  function bindRunBtn() {
    const btn = document.getElementById('run-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (isTesting) return;
      startTest();
    });
  }

  function startTest() {
    if (isTesting) return;
    isTesting = true;

    const btn   = document.getElementById('run-btn');
    const label = document.getElementById('run-label');
    if (btn)   { btn.classList.add('running'); btn.disabled = true; }
    if (label) label.textContent = 'Testing…';

    // Reset UI
    Gauge.reset();
    setGaugeLabel('Ping');
    setVal('gauge-val', '--');
    setVal('ping-val',  '--');
    setVal('jitter-val','--');
    setVal('loss-val',  '--');
    setVal('dl-val',    '--');
    setVal('ul-val',    '--');
    resetBars();
    dlHistory = Array(12).fill(0);
    ulHistory = Array(12).fill(0);
    renderSparks();

    const dur = parseInt(getSetting('setting-duration')) || 10;

    SpeedTest.run({
      duration: dur,

      onStatus(msg) {
        setStatus(msg);
        // Sync gauge label
        if (msg.includes('download')) setGaugeLabel('Download');
        else if (msg.includes('upload')) setGaugeLabel('Upload');
        else if (msg.includes('latency')) setGaugeLabel('Ping');
      },

      onPing({ ping, jitter }) {
        setVal('ping-val',   ping);
        setVal('jitter-val', jitter);
        Gauge.setValue(ping, 500);
        setVal('gauge-val', ping);
        setBar('ping-bar',   Math.min(ping / 200 * 100, 100));
        setBar('jitter-bar', Math.min(jitter / 50 * 100, 100));
      },

      onDownload(val, live) {
        setVal('dl-val',  val);
        setVal('gauge-val', val);
        setGaugeLabel('Download');
        Gauge.setValue(val, 200);
        dlHistory.push(val); dlHistory.shift();
        if (live) renderSparks();
      },

      onUpload(val, live) {
        setVal('ul-val',  val);
        setVal('gauge-val', val);
        setGaugeLabel('Upload');
        Gauge.setValue(val, 200);
        ulHistory.push(val); ulHistory.shift();
        if (live) renderSparks();
      },

      onLoss(val) {
        setVal('loss-val', val + '%');
        setBar('loss-bar', Math.min(val * 4, 100));
      },

      onDone(result) {
        isTesting = false;
        if (btn)   { btn.classList.remove('running'); btn.disabled = false; }
        if (label) label.textContent = 'Run Speed Test';
        setStatus('');

        // Final gauge at download
        Gauge.setValue(result.download, 200);
        setVal('gauge-val', result.download);
        setGaugeLabel('Download');

        // Save record
        const record = {
          timestamp:  Date.now(),
          download:   result.download,
          upload:     result.upload,
          ping:       result.ping,
          jitter:     result.jitter,
          loss:       result.loss,
          connType:   Network.getDisplayType(Network.getInfo()),
        };
        Storage.save(record);
        showToast('Test complete ✓');
        renderSparks();
      },
    });
  }

  // ── Diagnostics ───────────────────────────────────────────────────────
  function bindDiagBtn() {
    const btn = document.getElementById('run-diag-btn');
    if (btn) btn.addEventListener('click', () => Diagnostics.run());
  }

  // ── History ───────────────────────────────────────────────────────────
  function bindClearHistory() {
    const btn = document.getElementById('clear-history');
    if (btn) btn.addEventListener('click', () => {
      Storage.clear();
      renderHistoryPage();
      showToast('History cleared');
    });
  }

  function renderHistoryPage() {
    const list = document.getElementById('history-list');
    if (!list) return;

    const records = Storage.getAll();
    if (!records.length) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <p>No tests yet.<br/>Run your first speed test!</p>
        </div>`;
      HistoryChart.render([]);
      return;
    }

    list.innerHTML = records.slice(0, 20).map(r => {
      const date = new Date(r.timestamp);
      const dateStr = date.toLocaleDateString([], { month:'short', day:'numeric' });
      const timeStr = date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      const grade = r.download >= 25 ? 'good' : r.download >= 5 ? 'avg' : 'poor';
      const gradeLabel = grade === 'good' ? 'Fast' : grade === 'avg' ? 'OK' : 'Slow';
      const connLabel = r.connType === 'wifi' ? '📶 Wi-Fi' : r.connType === 'cellular' ? '📱 Cell' : '🌐';
      return `
        <div class="history-item">
          <div>
            <div class="hist-meta">${dateStr} · ${timeStr} · ${connLabel}</div>
            <div class="hist-speeds">
              <span class="hist-dl">↓ ${r.download} Mbps</span>
              <span class="hist-ul">↑ ${r.upload} Mbps</span>
            </div>
            <div class="hist-ping">Ping ${r.ping}ms · Jitter ${r.jitter}ms · Loss ${r.loss}%</div>
          </div>
          <span class="hist-badge ${grade}">${gradeLabel}</span>
        </div>`;
    }).join('');

    HistoryChart.render(records.slice(0, 10).reverse());
  }

  // ── Sparks ────────────────────────────────────────────────────────────
  function renderSparks() {
    renderSparkFor('dl-spark', dlHistory, 'download-card');
    renderSparkFor('ul-spark', ulHistory, 'upload-card');
  }
  function renderSparkFor(id, data, cardClass) {
    const el = document.getElementById(id);
    if (!el) return;
    const max = Math.max(...data, 1);
    el.innerHTML = data.map((v, i) => {
      const h = Math.max(4, Math.round((v / max) * 28));
      const active = v > 0 ? 'active' : '';
      return `<div class="spark-bar ${active}" style="height:${h}px"></div>`;
    }).join('');
  }

  // ── Install ───────────────────────────────────────────────────────────
  function bindInstall() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstall = e;
      const btn    = document.getElementById('install-btn');
      const status = document.getElementById('install-status');
      if (btn)    btn.style.display = 'inline-block';
      if (status) status.textContent = 'Available';
    });

    const btn = document.getElementById('install-btn');
    if (btn) btn.addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      deferredInstall = null;
      const status = document.getElementById('install-status');
      if (status) status.textContent = outcome === 'accepted' ? 'Installing…' : 'Dismissed';
      btn.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
      const status = document.getElementById('install-status');
      if (status) status.textContent = 'Installed ✓';
    });

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      const status = document.getElementById('install-status');
      if (status) status.textContent = 'Running as app';
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────
  function bindSettings() {
    ['setting-server','setting-duration','setting-units'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => saveSettings());
    });
    loadSettings();
  }

  function saveSettings() {
    ['setting-server','setting-duration','setting-units'].forEach(id => {
      const el = document.getElementById(id);
      if (el) localStorage.setItem(id, el.value);
    });
  }

  function loadSettings() {
    ['setting-server','setting-duration','setting-units'].forEach(id => {
      const el = document.getElementById(id);
      const v  = localStorage.getItem(id);
      if (el && v) el.value = v;
    });
  }

  function getSetting(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  }

  // ── Ripple ────────────────────────────────────────────────────────────
  function addRippleEffects() {
    document.querySelectorAll('.nav-btn, .run-btn, .ghost-btn').forEach(el => {
      el.addEventListener('click', function(e) {
        const r = document.createElement('span');
        r.className = 'ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
        this.appendChild(r);
        setTimeout(() => r.remove(), 600);
      });
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────
  function showToast(msg) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }
  function setStatus(msg) {
    const el = document.getElementById('test-status');
    if (el) el.textContent = msg;
  }
  function setGaugeLabel(label) {
    const el = document.getElementById('gauge-label');
    if (el) el.textContent = label;
  }
  function setBar(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
  function resetBars() {
    ['ping-bar','jitter-bar','loss-bar'].forEach(id => setBar(id, 0));
  }

})();