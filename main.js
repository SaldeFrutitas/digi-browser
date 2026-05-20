const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Dedicated session for web content (isolated from the shell UI)
const WEB_PARTITION = 'persist:webcontent';

let mainWindow;
let view;

// ─── URL Sanitization & Security ───────────────────────────────────────────────
const BLOCKED_PROTOCOLS = ['file:', 'javascript:', 'data:', 'vbscript:', 'about:'];

function sanitizeUrl(url) {
  const trimmed = url.trim();

  // Block dangerous protocols
  const lower = trimmed.toLowerCase();
  for (const proto of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      return null;
    }
  }

  // If it's already a valid http/https URL, return as-is
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      new URL(trimmed); // validate
      return trimmed;
    } catch {
      return null;
    }
  }

  // Looks like a domain → prepend https://
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return 'https://' + trimmed;
  }

  // Treat as search query
  return 'https://www.google.com/search?q=' + encodeURIComponent(trimmed);
}

// ─── Main Window ───────────────────────────────────────────────────────────────
function createWindow() {
  const isPackaged = app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    frame: false,
    transparent: true, // Keep transparency true to preserve rounded corners on Windows
    backgroundColor: '#00000000', // Transparent window background
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: true // Habilitamos webview para bordes redondeados
    }
  });

  mainWindow.loadFile('index.html');
  // DevTools disabled per user request
  // if (!isPackaged) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }

  // ─── Auto-reload on CSS / HTML change (dev only) ─────────────────────────
  if (!isPackaged) {
    const devFiles = ['style.css', 'index.html'];
    devFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        fs.watch(filePath, () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.reload();
          }
        });
      }
    });
  }

  // Notify renderer when window is maximized/unmaximized to toggle rounded corners
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state', 'normal');
  });
}

// ─── Window Controls (Registered Globally Once) ───
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') {
    return;
  }

  contents.setWindowOpenHandler(({ url }) => {
    const safeUrl = sanitizeUrl(url);

    if (
      safeUrl &&
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      mainWindow.webContents.send('open-new-tab', safeUrl);
    }

    return { action: 'deny' };
  });
});

ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
