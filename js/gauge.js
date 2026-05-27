// ── gauge.js — Canvas semi-circle speedometer ──────────────────────────
const Gauge = (() => {
  const canvas = document.getElementById('gauge-canvas');
  const ctx    = canvas ? canvas.getContext('2d') : null;

  let _current = 0;
  let _target  = 0;
  let _raf     = null;
  let _max     = 200; // Mbps

  const W = 280, H = 160;
  const CX = W / 2, CY = H - 20;
  const R_OUTER = 120, R_INNER = 90;
  const START_ANGLE = Math.PI;
  const END_ANGLE   = 2 * Math.PI;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function draw(val) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // ── Track ───────────────────────────────────
    ctx.beginPath();
    ctx.arc(CX, CY, (R_OUTER + R_INNER) / 2, START_ANGLE, END_ANGLE);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = R_OUTER - R_INNER;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // ── Speed ticks ─────────────────────────────
    for (let i = 0; i <= 10; i++) {
      const pct = i / 10;
      const angle = START_ANGLE + pct * Math.PI;
      const r1 = R_OUTER + 4, r2 = R_OUTER + (i % 5 === 0 ? 12 : 8);
      const cos = Math.cos(angle), sin = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(CX + r1 * cos, CY + r1 * sin);
      ctx.lineTo(CX + r2 * cos, CY + r2 * sin);
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (i % 5 === 0) {
        const label = Math.round((_max / 10) * i);
        const lr = R_OUTER + 22;
        ctx.font = '10px Space Mono, monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, CX + lr * cos, CY + lr * sin);
      }
    }

    // ── Fill arc ─────────────────────────────────
    if (val > 0) {
      const pct  = Math.min(val / _max, 1);
      const endA = START_ANGLE + pct * Math.PI;

      const grad = ctx.createLinearGradient(
        CX - R_OUTER, CY, CX + R_OUTER, CY
      );
      grad.addColorStop(0,   '#4cde9e');
      grad.addColorStop(0.5, '#6ee8b4');
      grad.addColorStop(1,   '#738aff');

      ctx.beginPath();
      ctx.arc(CX, CY, (R_OUTER + R_INNER) / 2, START_ANGLE, endA);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = R_OUTER - R_INNER;
      ctx.lineCap     = 'round';
      ctx.stroke();

      // Glow
      ctx.beginPath();
      ctx.arc(CX, CY, (R_OUTER + R_INNER) / 2, START_ANGLE, endA);
      ctx.strokeStyle = 'rgba(76,222,158,0.12)';
      ctx.lineWidth   = (R_OUTER - R_INNER) + 8;
      ctx.stroke();
    }

    // ── Needle ───────────────────────────────────
    const pct    = Math.min(val / _max, 1);
    const needleAngle = START_ANGLE + pct * Math.PI;
    const nR = R_INNER - 5;
    const nx = CX + nR * Math.cos(needleAngle);
    const ny = CY + nR * Math.sin(needleAngle);

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Needle pivot
    ctx.beginPath();
    ctx.arc(CX, CY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  function animate() {
    const diff = _target - _current;
    if (Math.abs(diff) < 0.2) {
      _current = _target;
      draw(_current);
      _raf = null;
      return;
    }
    _current += diff * 0.12;
    draw(_current);
    _raf = requestAnimationFrame(animate);
  }

  function setValue(val, maxVal) {
    if (maxVal) _max = maxVal;
    _target = val;
    if (!_raf) _raf = requestAnimationFrame(animate);
  }

  function reset() {
    _target = 0; _current = 0;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    draw(0);
  }

  draw(0);
  return { setValue, reset };
})();