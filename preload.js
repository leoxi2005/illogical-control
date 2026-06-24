// Secure bridge between renderer (canvas rendering) and main (NDI senders).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ndi', {
  // returns true if grandiose (NDI binding) loaded successfully in main
  available: () => ipcRenderer.invoke('ndi:available'),

  // cfg = { name, width, height, fps }
  start: (cfg) => ipcRenderer.invoke('ndi:start', cfg),
  stop: (name) => ipcRenderer.invoke('ndi:stop', name),
  status: () => ipcRenderer.invoke('ndi:status'),

  // hot path — meta = { name, width, height, fps }, data = Uint8Array (RGBA)
  sendFrame: (meta, data) => ipcRenderer.send('ndi:frame', meta, data)
});
