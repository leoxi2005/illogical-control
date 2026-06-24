// Scene B — Bomb Timer (default 8324 x 815)
// Ported 1:1 from bomb-timer.html: matrix-green countdown + glitch + morph "OPEN IT".
// Draws onto its own full-resolution offscreen canvas (scene.canvas).

export function createBombScene() {
  const canvas = document.createElement('canvas');
  // willReadFrequently: getImageData() is called every frame to feed NDI.
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });

  const params = {
    resW: 8324, resH: 815,
    min: 12, sec: 0,
    color: '#00ff5a',
    glow: 55,
    glitch: 22,
    scan: 30,
    fs: 78,
    revealtext: 'OPEN IT'
  };

  let phase = 'idle';            // idle | running | paused | finished | openit
  let remainMs = 12 * 60 * 1000, endAt = 0, finishBurst = 0, morphT = 1, morphFrom = '', morphTo = '';

  function durMs() { return (Math.max(0, +params.min) * 60 + Math.max(0, Math.min(59, +params.sec))) * 1000; }
  function start() {
    if (phase === 'running') return;
    if (phase === 'idle' || phase === 'finished') { remainMs = durMs(); }
    endAt = performance.now() + remainMs; phase = 'running';
  }
  function pause() { if (phase !== 'running') return; remainMs = Math.max(0, endAt - performance.now()); phase = 'paused'; }
  function toggle() { phase === 'running' ? pause() : start(); }
  function reset() { phase = 'idle'; remainMs = durMs(); finishBurst = 0; morphT = 1; }
  function reveal() { morphFrom = curText(); morphTo = (params.revealtext || 'OPEN IT'); morphT = 0; phase = 'openit'; }
  function fmt(ms) { const s = Math.ceil(ms / 1000); const m = (s / 60) | 0, ss = s % 60; return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss; }
  function curText() { if (phase === 'openit') return morphTo; if (phase === 'finished') return '00:00'; return fmt(remainMs); }

  function setRes(w, h) { canvas.width = Math.max(16, w | 0); canvas.height = Math.max(16, h | 0); tcKey = ''; }

  // cached glow text rendering
  let tc = document.createElement('canvas'), tcx = tc.getContext('2d'), tcKey = '';
  function buildText(str) {
    const H = canvas.height, fs = (+params.fs / 100) * H;
    const key = str + '|' + fs + '|' + params.color;
    if (key === tcKey) return; tcKey = key;
    const pad = fs * 0.5;
    tcx.font = '700 ' + fs + 'px ui-monospace,Menlo,Consolas,monospace';
    const w = tcx.measureText(str).width;
    tc.width = Math.ceil(w + pad * 2); tc.height = Math.ceil(fs * 1.5 + pad * 2);
    tcx.clearRect(0, 0, tc.width, tc.height);
    tcx.font = '700 ' + fs + 'px ui-monospace,Menlo,Consolas,monospace';
    tcx.textBaseline = 'middle'; tcx.textAlign = 'center';
    tcx.fillStyle = params.color;
    tcx.fillText(str, tc.width / 2, tc.height / 2);
  }
  function drawGlowText(str, cxp, cyp, alpha, glitchAmt) {
    buildText(str);
    const glow = (+params.glow / 100), W = canvas.height;
    const dx = cxp - tc.width / 2, dy = cyp - tc.height / 2;
    ctx.globalAlpha = alpha;
    if (glow > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(' + (W * 0.012 * glow).toFixed(1) + 'px)'; ctx.drawImage(tc, dx, dy);
      ctx.filter = 'blur(' + (W * 0.03 * glow).toFixed(1) + 'px)'; ctx.globalAlpha = alpha * 0.7; ctx.drawImage(tc, dx, dy);
      ctx.filter = 'none'; ctx.globalAlpha = alpha;
    }
    if (glitchAmt > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const bands = Math.round(2 + glitchAmt * 10);
      for (let i = 0; i < bands; i++) {
        if (Math.random() > 0.6) continue;
        const sy = Math.random() * tc.height, sh = tc.height * (0.03 + Math.random() * 0.12);
        const ox = (Math.random() * 2 - 1) * tc.width * 0.12 * glitchAmt;
        ctx.drawImage(tc, 0, sy, tc.width, sh, dx + ox, dy + sy, tc.width, sh);
      }
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.drawImage(tc, dx, dy);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  }

  const stats = { phase: 'idle', rem: '—' };

  function render(now) {
    const W = canvas.width, H = canvas.height;
    if (phase === 'running') { remainMs = endAt - now; if (remainMs <= 0) { remainMs = 0; phase = 'finished'; finishBurst = 1; } }
    if (phase === 'openit' && morphT < 1) { morphT = Math.min(1, morphT + 0.018); }
    finishBurst *= 0.95;

    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    const baseGlitch = +params.glitch / 100;
    const cxp = W / 2, cyp = H / 2;
    if (phase === 'openit') {
      const m = morphT, gl = baseGlitch + (0.6 * Math.sin(Math.min(1, m) * Math.PI));
      if (m < 1) drawGlowText(morphFrom, cxp, cyp, (1 - m), gl);
      drawGlowText(morphTo, cxp, cyp, m, gl);
    } else {
      const burst = finishBurst;
      drawGlowText(curText(), cxp, cyp, 1, baseGlitch + burst * 0.9);
      if (burst > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,' + (burst * 0.25).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // scanlines
    const scan = +params.scan / 100;
    if (scan > 0) {
      ctx.globalCompositeOperation = 'multiply';
      const lh = Math.max(2, H / 360);
      ctx.fillStyle = 'rgba(0,0,0,' + (scan * 0.5).toFixed(3) + ')';
      for (let y = 0; y < H; y += lh * 2) ctx.fillRect(0, y, W, lh);
      ctx.globalCompositeOperation = 'source-over';
    }

    stats.phase = phase;
    stats.rem = fmt(Math.max(0, remainMs));
  }

  function handleKey(e) {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'r' || e.key === 'R') reset();
    else if (e.key === 'o' || e.key === 'O') reveal();
  }

  // initialise
  setRes(params.resW, params.resH);
  reset();

  return {
    id: 'bomb',
    label: 'Bomb Timer',
    ndiName: 'IllogicalTimer',
    canvas, ctx, params, stats,
    setRes, render, handleKey, start, pause, reset, reveal,
    onParamChange(id) {
      if (id === 'resW' || id === 'resH') setRes(params.resW, params.resH);
      else if (id === 'fs' || id === 'color') tcKey = '';
      else if ((id === 'min' || id === 'sec') && (phase === 'idle' || phase === 'paused' || phase === 'finished')) { remainMs = durMs(); }
    },
    actions: [
      { id: 'start', label: '▶ Start (Space)', fn: start },
      { id: 'pause', label: '❚❚ Pause', fn: pause },
      { id: 'reset', label: '⟲ Reset (R)', fn: reset },
      { id: 'reveal', label: '✦ Reveal OPEN IT (O)', fn: reveal }
    ],
    controls: [
      { id: 'min', label: 'Phút', type: 'number', min: 0, max: 99 },
      { id: 'sec', label: 'Giây', type: 'number', min: 0, max: 59 },
      { id: 'color', label: 'Màu', type: 'color' },
      { id: 'glow', label: 'Glow', type: 'range', min: 0, max: 100 },
      { id: 'glitch', label: 'Glitch nền', type: 'range', min: 0, max: 100 },
      { id: 'scan', label: 'Scanlines', type: 'range', min: 0, max: 100 },
      { id: 'fs', label: 'Cỡ chữ (% chiều cao)', type: 'range', min: 20, max: 100 },
      { id: 'revealtext', label: 'Text khi mở (OPEN IT)', type: 'text' },
      { id: 'resW', label: 'Res W', type: 'number', min: 16, max: 16384 },
      { id: 'resH', label: 'Res H', type: 'number', min: 16, max: 16384 }
    ]
  };
}
