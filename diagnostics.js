// ── diagnostics.js — Network diagnostic checks ─────────────────────────
const Diagnostics = (() => {

  const checks = [
    {
      id: 'internet',
      name: 'Internet Connectivity',
      desc: 'Verifying reachability to public internet',
      icon: '🌐',
      iconBg: 'rgba(0,245,212,0.1)',
    },
    {
      id: 'dns',
      name: 'DNS Resolution',
      desc: 'Checking domain name resolution speed',
      icon: '🔍',
      iconBg: 'rgba(123,47,247,0.12)',
    },
    {
      id: 'latency',
      name: 'Latency Quality',
      desc: 'Measuring round-trip time to servers',
      icon: '⚡',
      iconBg: 'rgba(255,179,71,0.1)',
    },
    {
      id: 'stability',
      name: 'Connection Stability',
      desc: 'Detecting packet loss and jitter',
      icon: '📡',
      iconBg: 'rgba(57,217,138,0.1)',
    },
    {
      id: 'bandwidth',
      name: 'Bandwidth Estimate',
      desc: 'Quick bandwidth check via Network API',
      icon: '📊',
      iconBg: 'rgba(90,240,255,0.1)',
    },
    {
      id: 'ipv6',
      name: 'IPv6 Support',
      desc: 'Checking next-gen protocol availability',
      icon: '🔗',
      iconBg: 'rgba(163,116,240,0.1)',
    },
  ];

  function renderChecks() {
    const container = document.getElementById('diag-checks');
    if (!container) return;
    container.innerHTML = checks.map(c => `
      <div class="diag-item fade-up" id="diag-${c.id}" style="animation-delay:${checks.indexOf(c)*0.05}s">
        <div class="diag-icon" style="background:${c.iconBg}">${c.icon}</div>
        <div class="diag-text">
          <div class="diag-name">${c.name}</div>
          <div class="diag-desc">${c.desc}</div>
        </div>
        <div class="diag-status pending" id="status-${c.id}">—</div>
      </div>
    `).join('');
  }

  function setStatus(id, status, label) {
    const el = document.getElementById(`status-${id}`);
    if (!el) return;
    el.className = `diag-status ${status}`;
    el.textContent = label;
  }

  function setRunning(id) { setStatus(id, 'running', '…'); }

  async function runCheck(id, fn) {
    setRunning(id);
    await sleep(300 + Math.random() * 200);
    try {
      const result = await fn();
      setStatus(id, result.status, result.label);
      return result;
    } catch {
      setStatus(id, 'fail', 'Error');
      return { status: 'fail', score: 0 };
    }
  }

  // ── Individual checks ─────────────────────────────────────────────────

  async function checkInternet() {
    if (!navigator.onLine) return { status: 'fail', label: 'Offline', score: 0 };
    try {
      await fetch('https://www.google.com/favicon.ico?_=' + Date.now(), {
        mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(3000),
      });
      return { status: 'pass', label: 'Connected', score: 100 };
    } catch {
      return { status: 'warn', label: 'Limited', score: 40 };
    }
  }

  async function checkDNS() {
    const t0 = performance.now();
    try {
      await fetch('https://cloudflare-dns.com/dns-query?name=google.com&type=A', {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(2000),
        cache: 'no-store',
      });
      const rtt = performance.now() - t0;
      if (rtt < 100)  return { status: 'pass', label: `${Math.round(rtt)}ms`, score: 100 };
      if (rtt < 300)  return { status: 'warn', label: `${Math.round(rtt)}ms`, score: 65 };
      return { status: 'warn', label: `${Math.round(rtt)}ms`, score: 40 };
    } catch {
      // Fallback estimate
      const conn = navigator.connection;
      const rtt = conn ? conn.rtt : 50;
      if (rtt < 100) return { status: 'pass', label: `~${rtt}ms`, score: 90 };
      return { status: 'warn', label: `~${rtt}ms`, score: 60 };
    }
  }

  async function checkLatency() {
    const conn = navigator.connection;
    const rtt = conn ? conn.rtt : null;
    const samples = [];

    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      try {
        await fetch('https://www.gstatic.com/generate_204?_=' + Date.now() + i, {
          mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(1500),
        });
        samples.push(performance.now() - t0);
      } catch { if (rtt) samples.push(rtt); }
      await sleep(60);
    }

    const avg = samples.length
      ? Math.round(samples.reduce((a,b)=>a+b,0)/samples.length)
      : (rtt || 50);

    if (avg < 50)   return { status: 'pass', label: `${avg}ms`, score: 100 };
    if (avg < 100)  return { status: 'pass', label: `${avg}ms`, score: 85 };
    if (avg < 200)  return { status: 'warn', label: `${avg}ms`, score: 60 };
    return { status: 'fail', label: `${avg}ms`, score: 30 };
  }

  async function checkStability() {
    const total = 8, urls = [];
    for (let i = 0; i < total; i++) {
      urls.push(`https://www.google.com/favicon.ico?s=${i}_${Date.now()}`);
    }
    let success = 0;
    await Promise.all(urls.map(async u => {
      try {
        await fetch(u, { mode:'no-cors', cache:'no-store', signal: AbortSignal.timeout(2000) });
        success++;
      } catch {}
    }));
    const loss = ((total - success) / total) * 100;
    if (loss === 0)   return { status: 'pass', label: '0% loss',            score: 100 };
    if (loss <= 10)   return { status: 'warn', label: `${loss.toFixed(0)}% loss`, score: 70 };
    return { status: 'fail', label: `${loss.toFixed(0)}% loss`, score: 25 };
  }

  async function checkBandwidth() {
    const conn = navigator.connection;
    if (!conn) return { status: 'warn', label: 'N/A', score: 60 };
    const dl = conn.downlink;
    const eff = conn.effectiveType || '';
    if (dl >= 10)  return { status: 'pass', label: `${dl} Mbps`, score: 100 };
    if (dl >= 2)   return { status: 'pass', label: `${dl} Mbps`, score: 80 };
    if (dl >= 0.5) return { status: 'warn', label: `${dl} Mbps`, score: 50 };
    if (eff === '2g') return { status: 'fail', label: '2G', score: 20 };
    return { status: 'warn', label: `${dl || '?'} Mbps`, score: 45 };
  }

  async function checkIPv6() {
    try {
      const res = await fetch('https://ipv6.google.com/favicon.ico?_=' + Date.now(), {
        mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(2500),
      });
      return { status: 'pass', label: 'Supported', score: 100 };
    } catch {
      return { status: 'warn', label: 'IPv4 only', score: 75 };
    }
  }

  // ── Score ring ────────────────────────────────────────────────────────
  function updateScore(scores) {
    const weights = { internet: 30, dns: 15, latency: 20, stability: 20, bandwidth: 10, ipv6: 5 };
    let weighted = 0, totalW = 0;
    for (const [key, w] of Object.entries(weights)) {
      if (scores[key] != null) { weighted += scores[key] * w; totalW += w; }
    }
    const score = totalW ? Math.round(weighted / totalW) : 0;

    const el = document.getElementById('score-val');
    if (el) animateNumber(el, 0, score, 1200);

    // Arc
    const arc = document.getElementById('score-arc');
    if (arc) {
      const circumference = 314.16;
      const offset = circumference - (score / 100) * circumference;
      arc.style.strokeDashoffset = offset;

      // Color by score
      const color = score >= 75 ? '#39d98a' : score >= 50 ? '#ffb347' : '#ff4d6d';
      arc.style.stroke = color;
    }

    // Breakdown bars
    const breakdown = document.getElementById('score-breakdown');
    if (breakdown) {
      const rows = [
        { label: 'Internet',   key: 'internet' },
        { label: 'Latency',    key: 'latency' },
        { label: 'Stability',  key: 'stability' },
        { label: 'Bandwidth',  key: 'bandwidth' },
      ];
      breakdown.innerHTML = rows.map(r => {
        const val = scores[r.key] || 0;
        const color = val >= 75 ? '#39d98a' : val >= 50 ? '#ffb347' : '#ff4d6d';
        return `
          <div class="score-row">
            <span class="score-row-label">${r.label}</span>
            <div class="score-mini-bar">
              <div class="score-mini-fill" style="width:${val}%;background:${color}"></div>
            </div>
            <span class="score-row-val">${val}</span>
          </div>
        `;
      }).join('');
    }
  }

  function animateNumber(el, from, to, duration) {
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function run() {
    const scores = {};
    const btn = document.getElementById('run-diag-btn');
    if (btn) btn.disabled = true;

    renderChecks();

    const fns = {
      internet:  checkInternet,
      dns:       checkDNS,
      latency:   checkLatency,
      stability: checkStability,
      bandwidth: checkBandwidth,
      ipv6:      checkIPv6,
    };

    for (const [id, fn] of Object.entries(fns)) {
      const result = await runCheck(id, fn);
      scores[id] = result.score || 0;
    }

    updateScore(scores);
    if (btn) btn.disabled = false;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { renderChecks, run };
})();
