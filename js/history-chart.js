// ── history-chart.js — Canvas line chart for speed history ─────────────
const HistoryChart = (() => {
  let chart = null;

  function render(records) {
    const section = document.getElementById('chart-section');
    const canvas  = document.getElementById('history-chart');
    if (!canvas || !section) return;

    if (records.length < 2) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 300;
    const H = 160;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const dl = records.map(r => r.download).reverse();
    const ul = records.map(r => r.upload).reverse();
    const maxV = Math.max(...dl, ...ul, 1) * 1.2;

    const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.font = '9px Space Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round((maxV / 4) * i), PAD.left - 4, y + 3);
    }

    // Lines
    function drawLine(data, color, glow) {
      const pts = data.map((v, i) => ({
        x: PAD.left + (i / (data.length - 1)) * chartW,
        y: PAD.top  + chartH - (v / maxV) * chartH,
      }));

      // Fill gradient
      const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
      grad.addColorStop(0,   color.replace(')', ',0.25)').replace('rgb', 'rgba'));
      grad.addColorStop(1,   color.replace(')', ',0)').replace('rgb', 'rgba'));

      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : smoothTo(ctx, pts, i));
      ctx.lineTo(pts[pts.length-1].x, PAD.top + chartH);
      ctx.lineTo(pts[0].x, PAD.top + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : smoothTo(ctx, pts, i));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

      // Dots
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill();
      });
    }

    drawLine(dl, 'rgb(76,222,158)');
    drawLine(ul, 'rgb(115,138,255)');

    // X-axis labels
    const labels = records.map(r => {
      const d = new Date(r.timestamp);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }).reverse();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '9px Space Mono, monospace';
    ctx.textAlign = 'center';
    const step = Math.ceil(labels.length / 4);
    labels.forEach((l, i) => {
      if (i % step === 0 || i === labels.length - 1) {
        const x = PAD.left + (i / (labels.length - 1)) * chartW;
        ctx.fillText(l, x, H - 4);
      }
    });

    // Legend
    ctx.font = '10px DM Sans, sans-serif';
    ctx.fillStyle = 'rgb(76,222,158)';
    ctx.textAlign = 'left';
    ctx.fillRect(W - 110, 4, 10, 3);
    ctx.fillText('↓ Download', W - 96, 9);
    ctx.fillStyle = 'rgb(115,138,255)';
    ctx.fillRect(W - 110, 14, 10, 3);
    ctx.fillText('↑ Upload', W - 96, 19);
  }

  function smoothTo(ctx, pts, i) {
    const p0 = pts[i-1], p1 = pts[i];
    const mx = (p0.x + p1.x) / 2;
    ctx.bezierCurveTo(mx, p0.y, mx, p1.y, p1.x, p1.y);
  }

  return { render };
})();