// Scene A — Floor Spots (default 3305 x 2561)
// Ported 1:1 from floor-spots.html: numbered light pools, lit sequentially.
// Draws onto its own full-resolution offscreen canvas (scene.canvas).

export function createFloorScene() {
  const canvas = document.createElement('canvas');
  // willReadFrequently: getImageData() is called every frame to feed NDI.
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });

  const params = {
    resW: 3305, resH: 2561,
    count: 12,
    cols: 0,
    startn: 1,
    mode: 'manual',     // all | manual | auto
    active: 0,
    stepsec: 1.5,
    loop: 0,            // 0 | 1
    showoff: 1,         // 1 | 0  (show markers for off spots)
    size: 60,
    glow: 35,
    warm: '#ffcaa0',
    numcol: '#00ff5a',
    numsize: 38,
    breath: 22
  };

  let seed = 1;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  let N = 12, phases = [], litAmt = [], flash = [];
  function rebuild() {
    N = Math.max(1, params.count | 0);
    seed = (Math.random() * 1e9) >>> 0;
    phases = []; litAmt = []; flash = [];
    for (let i = 0; i < N; i++) { phases.push({ p: rnd() * 6.28, s: 0.6 + rnd() * 0.8 }); litAmt.push(0); flash.push(0); }
    if ((params.active | 0) > N) params.active = N;
  }
  function setActive(v) {
    v = Math.max(0, Math.min(N, v | 0));
    const prev = params.active | 0;
    params.active = v;
    if (v > prev) { for (let i = prev; i < v; i++) flash[i] = 1; }
  }
  function getActive() {
    if (params.mode === 'all') return N;
    return Math.min(N, params.active | 0);
  }
  function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

  function setRes(w, h) { canvas.width = Math.max(16, w | 0); canvas.height = Math.max(16, h | 0); }

  let autoAcc = 0;
  let last = performance.now();
  const stats = { active: 0, total: N };

  function render(now) {
    const dt = (now - last) / 1000; last = now;
    const W = canvas.width, H = canvas.height, t = now / 1000;
    if ((params.count | 0) !== N) rebuild();
    const mode = params.mode;
    if (mode === 'auto') {
      autoAcc += dt; const step = Math.max(0.1, +params.stepsec);
      while (autoAcc >= step) {
        autoAcc -= step; let a = params.active | 0;
        if (a < N) setActive(a + 1);
        else { if (String(params.loop) === '1') setActive(0); else { autoAcc = 0; break; } }
      }
    }
    const active = getActive();

    let cols = params.cols | 0; if (cols <= 0) cols = Math.max(1, Math.round(Math.sqrt(N * W / H)));
    const rows = Math.ceil(N / cols), cw = W / cols, ch = H / rows;
    const sizeF = +params.size / 100, glow = +params.glow / 100, breath = +params.breath / 100;
    const warm = hex2rgb(params.warm), startn = +params.startn, numsizeF = +params.numsize / 100;
    const showoff = String(params.showoff) === '1';
    const R = Math.min(cw, ch) * 0.5 * sizeF;

    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < N; i++) {
      const c = i % cols, r = (i / cols) | 0;
      const rowCount = (r === rows - 1) ? (N - cols * r) : cols; const xoff = (cols - rowCount) * cw * 0.5;
      const cx = xoff + c * cw + cw / 2, cy = r * ch + ch / 2;
      const target = (i < active) ? 1 : 0;
      litAmt[i] += (target - litAmt[i]) * Math.min(1, dt * 8);
      flash[i] *= 0.92;
      const ph = phases[i]; const br = 1 - breath * 0.4 + breath * 0.4 * Math.sin(t * ph.s + ph.p);
      const v = litAmt[i] * br + flash[i] * 0.6;
      const rr = R * (1 + flash[i] * 0.12);

      if (v > 0.02) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',' + (0.42 * v).toFixed(3) + ')');
        g.addColorStop(0.30, 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',' + (0.24 * v).toFixed(3) + ')');
        g.addColorStop(0.65, 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',' + (0.07 * v).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',' + (0.07 * v).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, R * 0.01); ctx.beginPath(); ctx.arc(cx, cy, rr * 0.86, 0, 6.2832); ctx.stroke();
      } else if (showoff) {
        ctx.strokeStyle = 'rgba(' + warm[0] + ',' + warm[1] + ',' + warm[2] + ',0.05)';
        ctx.lineWidth = Math.max(1, R * 0.01); ctx.beginPath(); ctx.arc(cx, cy, R * 0.7, 0, 6.2832); ctx.stroke();
      }

      // number — drawn ON TOP, with dark knock-back so it stays readable over the pool
      if (numsizeF > 0 && (v > 0.02 || showoff)) {
        const fs = R * numsizeF * 1.1, num = String(startn + i);
        ctx.font = '700 ' + fs + 'px ui-monospace,Menlo,Consolas,monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (v > 0.02) {
          ctx.globalCompositeOperation = 'source-over';
          const nd = fs * 0.85, dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, nd);
          dg.addColorStop(0, 'rgba(0,0,0,' + (0.42 * Math.min(1, v)).toFixed(3) + ')'); dg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(cx, cy, nd, 0, 6.2832); ctx.fill();
          ctx.shadowColor = params.numcol; ctx.shadowBlur = fs * 0.14 * (0.5 + glow);
          ctx.fillStyle = params.numcol; ctx.globalAlpha = Math.min(1, 0.95 * v + 0.05);
          ctx.fillText(num, cx, cy);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'lighter';
        } else {
          ctx.fillStyle = 'rgba(120,140,120,0.16)'; ctx.fillText(num, cx, cy);
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    stats.active = active; stats.total = N;
  }

  function handleKey(e) {
    if (e.code === 'ArrowRight' || e.code === 'Space') { e.preventDefault(); setActive((params.active | 0) + 1); }
    else if (e.code === 'ArrowLeft') { setActive((params.active | 0) - 1); }
    else if (e.key === 'a' || e.key === 'A') { params.mode = 'all'; setActive(N); }
    else if (e.key === 'r' || e.key === 'R') { setActive(0); for (let i = 0; i < N; i++) { litAmt[i] = 0; flash[i] = 0; } }
    else if (e.key >= '1' && e.key <= '9') { setActive(parseInt(e.key, 10)); }
  }

  // initialise
  setRes(params.resW, params.resH);
  rebuild();

  return {
    id: 'floor',
    label: 'Floor Spots',
    ndiName: 'IllogicalFloor',
    canvas, ctx, params, stats,
    setRes, render, handleKey, rebuild, setActive, getActive,
    // side effects when a control changes
    onParamChange(id) {
      if (id === 'count') rebuild();
      else if (id === 'resW' || id === 'resH') setRes(params.resW, params.resH);
      else if (id === 'active') setActive(params.active);
    },
    actions: [
      { id: 'next', label: '▶ Next (→/Space)', fn() { setActive((params.active | 0) + 1); } },
      { id: 'prev', label: '◀ Prev (←)', fn() { setActive((params.active | 0) - 1); } },
      { id: 'all', label: 'Bật hết (A)', fn() { params.mode = 'all'; setActive(N); } },
      { id: 'reset', label: '⟲ Reset (R)', fn() { setActive(0); for (let i = 0; i < N; i++) { litAmt[i] = 0; flash[i] = 0; } } }
    ],
    controls: [
      { id: 'count', label: 'Số spot (người)', type: 'number', min: 1, max: 200 },
      { id: 'cols', label: 'Số cột (0 = auto)', type: 'number', min: 0, max: 40 },
      { id: 'startn', label: 'Số bắt đầu', type: 'number', min: 0, max: 999 },
      { id: 'mode', label: 'Chế độ bật', type: 'select', options: [['all', 'Bật hết'], ['manual', 'Bật tay (Next / scrub)'], ['auto', 'Tuần tự tự động']] },
      { id: 'active', label: 'Số spot đang bật', type: 'number', min: 0, max: 200 },
      { id: 'stepsec', label: 'Nhịp tự động (giây)', type: 'number', min: 0.1, max: 30, step: 0.1 },
      { id: 'loop', label: 'Auto lặp lại', type: 'select', options: [['0', 'Không (dừng ở cuối)'], ['1', 'Có']] },
      { id: 'showoff', label: 'Hiện marker spot tắt', type: 'select', options: [['1', 'Có (mờ)'], ['0', 'Không']] },
      { id: 'size', label: 'Cỡ vũng sáng', type: 'range', min: 20, max: 100 },
      { id: 'glow', label: 'Glow / mềm rìa', type: 'range', min: 0, max: 100 },
      { id: 'warm', label: 'Màu vũng sáng', type: 'color' },
      { id: 'numcol', label: 'Màu số', type: 'color' },
      { id: 'numsize', label: 'Cỡ số', type: 'range', min: 0, max: 100 },
      { id: 'breath', label: 'Thở nhẹ', type: 'range', min: 0, max: 100 },
      { id: 'resW', label: 'Res W', type: 'number', min: 16, max: 16384 },
      { id: 'resH', label: 'Res H', type: 'number', min: 16, max: 16384 }
    ]
  };
}
