// Electron main process
// - Creates the control window (renderer renders the scene canvases at full res)
// - Owns the NDI senders (ndi/sender.js wraps grandiose)
// - Receives RGBA frame buffers via IPC, converts RGBA -> BGRA, pushes to NDI

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ndi = require('./ndi/sender');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 980,
    backgroundColor: '#05070a',
    title: 'Illogical Control',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // win.webContents.openDevTools({ mode: 'detach' });
}

// ---- IPC: NDI control --------------------------------------------------

ipcMain.handle('ndi:available', () => ndi.isAvailable());

ipcMain.handle('ndi:start', async (_e, cfg) => {
  try {
    await ndi.startSender(cfg); // { name, width, height, fps }
    return { ok: true, name: cfg.name };
  } catch (err) {
    return { ok: false, name: cfg.name, error: String(err && err.message || err) };
  }
});

ipcMain.handle('ndi:stop', (_e, name) => {
  ndi.stopSender(name);
  return { ok: true, name };
});

ipcMain.handle('ndi:status', () => ndi.status());

// Hot path: a video frame arrived from the renderer.
// meta = { name, width, height, fps }; data is a Uint8Array (RGBA, top-left origin).
ipcMain.on('ndi:frame', (_e, meta, data) => {
  // data may arrive as Uint8Array or Buffer depending on Electron's structured clone.
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer || data);
  ndi.sendFrame(meta, buf);
});

// ---- App lifecycle -----------------------------------------------------

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  ndi.stopAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => ndi.stopAll());
