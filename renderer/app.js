// Renderer orchestrator:
// - owns the scenes, the active view, the NDI output set, the render loop
// - routes keyboard to the active scene
// - reads each output scene's full-res pixels and ships them to main for NDI

import { createFloorScene } from './scenes/floor-spots.js';
import { createBombScene } from './scenes/bomb-timer.js';
import { buildPanel, refreshBoundInputs } from './ui/controls.js';

const scenes = [createFloorScene(), createBombScene()];
const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));

let activeId = scenes[0].id;
const outputs = new Set();        // scene ids currently streaming to NDI
let fps = 30;
let ndiAvailable = false;

const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');
const panelMount = document.getElementById('panel');
const sidebar = document.getElementById('sidebar');
const statusEl = document.getElementById('status');

// ---- sidebar (scene tabs + per-scene NDI toggle) -----------------------

function buildSidebar() {
  sidebar.innerHTML = '';
  for (const s of scenes) {
    const item = document.createElement('div');
    item.className = 'tab' + (s.id === activeId ? ' active' : '');
    item.dataset.scene = s.id;

    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = s.label;
    item.appendChild(title);

    const sub = document.createElement('div');
    sub.className = 'tab-sub';
    sub.textContent = s.ndiName + ' · ' + s.params.resW + '×' + s.params.resH;
    item.appendChild(sub);

    const row = document.createElement('div');
    row.className = 'tab-row';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.id = 'dot-' + s.id;
    const btn = document.createElement('button');
    btn.className = 'ndi-btn';
    btn.id = 'ndi-' + s.id;
    btn.textContent = 'Start NDI';
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleOutput(s.id); });
    row.appendChild(dot);
    row.appendChild(btn);
    item.appendChild(row);

    title.addEventListener('click', () => setActive(s.id));
    sub.addEventListener('click', () => setActive(s.id));
    sidebar.appendChild(item);
  }

  // Start All / Stop All
  const all = document.createElement('div');
  all.className = 'all-row';
  const startAll = document.createElement('button');
  startAll.textContent = 'Start All';
  startAll.addEventListener('click', () => { scenes.forEach((s) => startOutput(s.id)); });
  const stopAll = document.createElement('button');
  stopAll.textContent = 'Stop All';
  stopAll.addEventListener('click', () => { scenes.forEach((s) => stopOutput(s.id)); });
  all.appendChild(startAll); all.appendChild(stopAll);
  sidebar.appendChild(all);

  // fps selector
  const fpsRow = document.createElement('div');
  fpsRow.className = 'fps-row';
  const flabel = document.createElement('label');
  flabel.textContent = 'FPS';
  const fsel = document.createElement('select');
  for (const v of [30, 60]) {
    const o = document.createElement('option'); o.value = v; o.textContent = v; fsel.appendChild(o);
  }
  fsel.value = fps;
  fsel.addEventListener('change', () => { fps = +fsel.value; });
  fpsRow.appendChild(flabel); fpsRow.appendChild(fsel);
  sidebar.appendChild(fpsRow);
}

function setActive(id) {
  activeId = id;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.scene === id));
  buildPanel(byId[id], panelMount);
  resizePreview();
}

// ---- NDI output toggles ------------------------------------------------

async function startOutput(id) {
  if (outputs.has(id)) return;
  const s = byId[id];
  const res = await window.ndi.start({ name: s.ndiName, width: s.params.resW, height: s.params.resH, fps });
  if (res.ok) {
    outputs.add(id);
    updateNdiButton(id);
  } else {
    flashError(res.error || 'NDI start failed');
    updateNdiButton(id);
  }
}

async function stopOutput(id) {
  if (!outputs.has(id)) return;
  const s = byId[id];
  await window.ndi.stop(s.ndiName);
  outputs.delete(id);
  updateNdiButton(id);
}

function toggleOutput(id) { outputs.has(id) ? stopOutput(id) : startOutput(id); }

function updateNdiButton(id) {
  const on = outputs.has(id);
  const btn = document.getElementById('ndi-' + id);
  const dot = document.getElementById('dot-' + id);
  if (btn) btn.textContent = on ? 'Stop NDI' : 'Start NDI';
  if (btn) btn.classList.toggle('on', on);
  if (dot) dot.classList.toggle('on', on);
}

function flashError(msg) {
  statusEl.classList.add('err');
  statusEl.textContent = '⚠ ' + msg;
  setTimeout(() => statusEl.classList.remove('err'), 4000);
}

// ---- preview sizing ----------------------------------------------------

function resizePreview() {
  const s = byId[activeId];
  const box = preview.parentElement.getBoundingClientRect();
  const ar = s.canvas.width / s.canvas.height;
  let w = box.width, h = w / ar;
  if (h > box.height) { h = box.height; w = h * ar; }
  preview.width = Math.max(2, Math.round(w));
  preview.height = Math.max(2, Math.round(h));
}
window.addEventListener('resize', resizePreview);

// ---- keyboard routing (active scene only) ------------------------------

window.addEventListener('keydown', (e) => {
  // ignore when typing into an input
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const s = byId[activeId];
  s.handleKey(e);
  refreshBoundInputs(s);
});

// ---- main render / send loop -------------------------------------------

let lastSend = 0;
let frameCount = 0, fpsT = performance.now(), realFps = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const interval = 1000 / fps;
  if (now - lastSend < interval - 1.5) return;
  lastSend = now;

  // render every scene that is either being viewed or streaming
  const need = new Set(outputs);
  need.add(activeId);
  for (const id of need) byId[id].render(now);

  // preview the active scene
  const a = byId[activeId];
  pctx.drawImage(a.canvas, 0, 0, preview.width, preview.height);

  // ship NDI frames
  for (const id of outputs) {
    const s = byId[id];
    const w = s.canvas.width, h = s.canvas.height;
    const img = s.ctx.getImageData(0, 0, w, h); // RGBA, top-left origin
    window.ndi.sendFrame({ name: s.ndiName, width: w, height: h, fps }, img.data);
  }

  // fps + status
  frameCount++;
  if (now - fpsT > 500) { realFps = Math.round(frameCount * 1000 / (now - fpsT)); frameCount = 0; fpsT = now; }
  updateStatus();
}

function updateStatus() {
  const a = byId[activeId];
  let line = `Scene: ${a.label} · render ${realFps}fps · NDI ${ndiAvailable ? 'ready' : 'unavailable'} · streaming: ${outputs.size ? [...outputs].map((id) => byId[id].ndiName).join(', ') : 'none'}`;
  if (a.id === 'floor') line += ` · spots ${a.stats.active}/${a.stats.total}`;
  if (a.id === 'bomb') line += ` · ${a.stats.phase} · ${a.stats.rem}`;
  if (!statusEl.classList.contains('err')) statusEl.textContent = line;
}

// ---- boot --------------------------------------------------------------

async function boot() {
  ndiAvailable = await window.ndi.available();
  buildSidebar();
  setActive(activeId);
  if (!ndiAvailable) {
    flashError('NDI (grandiose) chưa sẵn sàng — xem README để cài NDI runtime + build native. Visual vẫn chạy/preview bình thường.');
  }
  requestAnimationFrame(loop);
}

boot();
