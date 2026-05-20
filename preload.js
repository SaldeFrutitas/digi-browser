const { contextBridge, ipcRenderer } = require('electron');

//  Expose ONLY a minimal, safe API surface to the renderer
// No direct Node.js access, no raw ipcRenderer exposure
contextBridge.exposeInMainWorld('browserAPI', {
  goBack:    () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
  reload:    () => ipcRenderer.send('reload'),

  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose:    () => ipcRenderer.send('window-close'),

  //  Validate input before sending to main process
  navigate: (url) => {
    if (typeof url !== 'string') return;
    const trimmed = url.trim();
    if (trimmed.length === 0 || trimmed.length > 2048) return; // Reasonable URL length limit
    ipcRenderer.send('navigate', trimmed);
  },

  //  One-way listeners  renderer cannot send arbitrary events back
  onUrlChanged:      (cb) => ipcRenderer.on('url-changed',      (_, url)     => cb(String(url))),
  onTitleChanged:    (cb) => ipcRenderer.on('title-changed',    (_, title)   => cb(String(title))),
  onSecurityChanged: (cb) => ipcRenderer.on('security-changed', (_, isHttps) => cb(Boolean(isHttps))),
  onUrlBlocked:      (cb) => ipcRenderer.on('url-blocked',      (_, url)     => cb(String(url))),
  onDidStartLoading: (cb) => ipcRenderer.on('did-start-loading', cb),
  onDidStopLoading:  (cb) => ipcRenderer.on('did-stop-loading',  cb),
  onWindowState:     (cb) => ipcRenderer.on('window-state',     (_, state)   => cb(String(state))),
  onOpenNewTab:      (cb) => ipcRenderer.on('open-new-tab',     (_, url)     => cb(String(url))),
});

