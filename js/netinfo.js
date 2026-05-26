// ── netinfo.js — ISP, Cell, DNS, Wi-Fi info ─────────────────────────────
const NetInfo = (() => {

  // ── ISP / IP Lookup ───────────────────────────────────────────────────
  async function fetchISP() {
    const apis = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,hosting,proxy,query',
      'https://ipwho.is/',
    ];
    for (const url of apis) {
      try {
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        const d   = await res.json();
        // Normalize across providers
        return {
          ip:       d.ip || d.query || '—',
          isp:      d.isp || d.org || d.connection?.isp || '—',
          org:      d.org || d.asname || d.connection?.org || '—',
          asn:      d.asn || d.as || (d.connection ? `AS${d.connection.asn}` : '—'),
          country:  d.country || d.country_name || '—',
          countryCode: d.country_code || d.countryCode || '',
          region:   d.region || d.regionName || '—',
          city:     d.city || '—',
          timezone: d.timezone || '—',
          hostname: d.hostname || '—',
          lat:      d.latitude || d.lat || null,
          lon:      d.longitude || d.lon || null,
          proxy:    d.proxy || d.hosting || false,
        };
      } catch { continue; }
    }
    return null;
  }

  function renderISP(data) {
    const show = id => { const e = document.getElementById(id); if (e) e.classList.remove('hidden'); };
    const hide = id => { const e = document.getElementById(id); if (e) e.classList.add('hidden'); };
    const set  = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    hide('isp-loading');
    show('isp-content');

    const flag = data.countryCode ? String.fromCodePoint(...[...data.countryCode.toUpperCase()].map(c => 0x1F1E0 - 65 + c.charCodeAt(0))) : '';
    set('isp-name',    data.isp);
    set('isp-org',     data.org !== data.isp ? data.org : data.asn);
    set('isp-ip',      data.ip);
    set('isp-ipver',   data.ip.includes(':') ? 'IPv6' : 'IPv4');
    set('isp-asn',     data.asn);
    set('isp-country', `${flag} ${data.country}`);
    set('isp-region',  data.region);
    set('isp-city',    data.city);
    set('isp-tz',      data.timezone);
    set('isp-host',    data.hostname !== '—' ? data.hostname : data.ip);

    if (data.lat) set('loc-lat', data.lat.toFixed(4) + '°');
    if (data.lon) set('loc-lon', data.lon.toFixed(4) + '°');

    // VPN/Proxy detection
    const vpnBadge = document.getElementById('vpn-badge');
    if (data.proxy && vpnBadge) vpnBadge.classList.remove('hidden');
    set('vpn-status',   data.proxy ? '⚠️ Possible' : '✓ None detected');
    set('proxy-status', data.proxy ? '⚠️ Detected'  : '✓ None');
  }

  // ── Cell / Signal Info ────────────────────────────────────────────────
  function renderCell() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const set  = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    const type    = conn ? (conn.type || 'unknown') : 'unknown';
    const effType = conn ? (conn.effectiveType || '—') : '—';
    const dl      = conn ? conn.downlink : null;
    const rtt     = conn ? conn.rtt : null;
    const save    = conn ? conn.saveData : null;

    set('cell-type',  type.charAt(0).toUpperCase() + type.slice(1));
    set('cell-eff',   effType.toUpperCase());
    set('cell-dl',    dl != null ? `${dl} Mbps` : '—');
    set('cell-rtt',   rtt != null ? `${rtt} ms` : '—');
    set('cell-save',  save != null ? (save ? 'On' : 'Off') : '—');

    // Battery API
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const pct  = Math.round(b.level * 100);
        const icon = b.charging ? '⚡' : pct > 60 ? '🔋' : pct > 20 ? '🪫' : '🔴';
        set('cell-battery', `${icon} ${pct}%${b.charging ? ' Charging' : ''}`);
      }).catch(() => set('cell-battery', '—'));
    } else {
      set('cell-battery', '—');
    }

    // Signal strength visual
    renderSignalBars(effType, type, dl);

    // IPv6 check
    checkIPv6().then(ok => set('ipv6-status', ok ? '✓ Supported' : 'IPv4 only'));

    // WebRTC leak check
    checkWebRTCLeak().then(leaked => set('webrtc-status', leaked ? '⚠️ IP visible' : '✓ No leak'));
  }

  function renderSignalBars(effType, type, dl) {
    const bars     = document.querySelectorAll('.sig-bar');
    const label    = document.getElementById('signal-strength');
    const typeBadge = document.getElementById('signal-type-badge');

    // Score signal 1–5
    let score = 3;
    if (effType === '4g' || type === 'wifi') score = 5;
    else if (effType === '3g') score = 3;
    else if (effType === '2g') score = 2;
    else if (effType === 'slow-2g') score = 1;
    if (dl >= 50) score = 5;
    else if (dl >= 10) score = 4;
    else if (dl >= 2)  score = 3;
    else if (dl >= 0.5) score = 2;
    else if (dl > 0)    score = 1;

    const colors = ['#ff4d6d','#ff4d6d','#ffb347','#ffb347','#39d98a'];
    const labels = ['Very Weak','Weak','Fair','Good','Excellent'];

    bars.forEach((b, i) => {
      b.style.background = i < score ? colors[score - 1] : 'rgba(255,255,255,0.08)';
      b.style.boxShadow  = i < score ? `0 0 6px ${colors[score-1]}60` : 'none';
    });
    if (label)    label.textContent = labels[score - 1];
    if (typeBadge) {
      const displayType = type === 'wifi' ? 'Wi-Fi' : effType.toUpperCase();
      typeBadge.textContent = displayType;
      typeBadge.className = `signal-type-badge ${type === 'wifi' ? 'badge-wifi' : 'badge-cell'}`;
    }
  }

  // ── DNS Benchmark ─────────────────────────────────────────────────────
  const DNS_SERVERS = [
    { name: 'Cloudflare', ip: '1.1.1.1',   url: 'https://cloudflare-dns.com/dns-query?name=google.com&type=A', color: '#f6821f' },
    { name: 'Google',     ip: '8.8.8.8',   url: 'https://dns.google/resolve?name=google.com&type=A',           color: '#4285F4' },
    { name: 'Quad9',      ip: '9.9.9.9',   url: 'https://dns.quad9.net/dns-query?name=google.com&type=A',      color: '#6f42c1' },
    { name: 'OpenDNS',    ip: '208.67.222.222', url: 'https://doh.opendns.com/dns-query?name=google.com&type=A', color: '#00a0d1' },
    { name: 'AdGuard',    ip: '94.140.14.14', url: 'https://dns.adguard.com/dns-query?name=google.com&type=A',  color: '#67b346' },
  ];

  async function benchmarkDNS() {
    const container = document.getElementById('dns-results');
    const btn       = document.getElementById('run-dns-btn');
    if (!container || !btn) return;

    btn.disabled = true;
    container.innerHTML = `<div class="ni-loading"><div class="ni-spinner"></div><span>Benchmarking ${DNS_SERVERS.length} DNS servers…</span></div>`;

    const results = [];

    for (const server of DNS_SERVERS) {
      // 3 samples, take average
      const times = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        try {
          await fetch(server.url + `&_=${Date.now()}`, {
            headers: { Accept: 'application/dns-json' },
            cache:   'no-store',
            signal:  AbortSignal.timeout(2500),
          });
          times.push(performance.now() - t0);
        } catch {
          times.push(null);
        }
        await sleep(50);
      }
      const valid = times.filter(t => t !== null);
      const avg   = valid.length ? Math.round(valid.reduce((a,b)=>a+b,0)/valid.length) : null;
      results.push({ ...server, ms: avg });
    }

    // Sort by speed
    results.sort((a,b) => {
      if (a.ms === null) return 1;
      if (b.ms === null) return -1;
      return a.ms - b.ms;
    });

    const best = results[0].ms || 1;
    container.innerHTML = results.map((r, i) => {
      const pct   = r.ms ? Math.round((1 - (r.ms - best) / (best * 4)) * 100) : 0;
      const label = r.ms === null ? 'Timeout' : `${r.ms}ms`;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const quality = r.ms === null ? 'fail' : r.ms < 50 ? 'pass' : r.ms < 150 ? 'warn' : 'fail';
      return `
        <div class="dns-row">
          <div class="dns-row-top">
            <span class="dns-name">${medal} ${r.name}</span>
            <span class="dns-ip">${r.ip}</span>
            <span class="dns-ms diag-status ${quality}">${label}</span>
          </div>
          <div class="dns-bar-wrap">
            <div class="dns-bar" style="width:${Math.max(pct,5)}%;background:${r.color}"></div>
          </div>
        </div>`;
    }).join('');

    btn.disabled = false;
  }

  // ── Wi-Fi Channel Info ────────────────────────────────────────────────
  async function renderWifiInfo() {
    // Browser doesn't expose SSID/channel directly — show what we can
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const type = conn ? conn.type : 'unknown';

    // We can derive band estimate from effective type + downlink
    const dl = conn ? conn.downlink : 0;
    let band = '—', channel = '—', freq = '—';

    if (type === 'wifi' || (!type && navigator.onLine)) {
      // Heuristic: >100Mbps likely 5GHz, else 2.4GHz
      if (dl >= 100) { band = '5 GHz'; freq = '5150–5850 MHz'; }
      else if (dl >= 20) { band = 'Likely 5 GHz'; freq = '~5 GHz'; }
      else { band = 'Likely 2.4 GHz'; freq = '2400–2484 MHz'; }
    }

    document.getElementById('wifi-band')    && (document.getElementById('wifi-band').textContent    = band);
    document.getElementById('wifi-freq')    && (document.getElementById('wifi-freq').textContent    = freq);
    document.getElementById('wifi-channel') && (document.getElementById('wifi-channel').textContent = channel);
  }

  // ── Privacy checks ────────────────────────────────────────────────────
  async function checkIPv6() {
    try {
      await fetch('https://ipv6.google.com/favicon.ico?_=' + Date.now(), {
        mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(2500),
      });
      return true;
    } catch { return false; }
  }

  async function checkWebRTCLeak() {
    return new Promise(resolve => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        let found = false;
        const t = setTimeout(() => { pc.close(); resolve(false); }, 2500);
        pc.onicecandidate = e => {
          if (!e.candidate) return;
          if (/([0-9]{1,3}\.){3}[0-9]{1,3}/.test(e.candidate.candidate)) {
            found = true; clearTimeout(t); pc.close(); resolve(true);
          }
        };
      } catch { resolve(false); }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────
  async function init() {
    renderCell();

    // ISP lookup
    const data = await fetchISP();
    if (data) renderISP(data);
    else {
      document.getElementById('isp-loading') && (document.getElementById('isp-loading').innerHTML = '<span style="color:var(--red)">Could not fetch ISP info</span>');
    }

    // Bind DNS button
    const dnsBtn = document.getElementById('run-dns-btn');
    if (dnsBtn) dnsBtn.addEventListener('click', benchmarkDNS);

    // Refresh button
    const refreshBtn = document.getElementById('refresh-netinfo');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
      document.getElementById('isp-loading')  && document.getElementById('isp-loading').classList.remove('hidden');
      document.getElementById('isp-content')  && document.getElementById('isp-content').classList.add('hidden');
      init();
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { init };
})();
