import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { registerIpc, CHANNELS } from './ipc';
import { SiteStore } from './SiteStore';
import { LabelStore } from './LabelStore';
import { APP_NAME, buildAppMenuTemplate, configureAboutPanel } from './about';
import { initAutoUpdate } from './autoUpdateInit';

// Override the name Electron shows in the macOS menu bar, dock, and About panel.
// Without this, an unpackaged/dev run reports the generic "Electron" name.
app.setName(APP_NAME);

// Last-resort guards so a stray error/rejection logs a stack instead of popping
// Electron's fatal "A JavaScript error occurred in the main process" dialog.
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled rejection:', reason);
});

let win: BrowserWindow | null = null;

function isAllowedDevRendererUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.protocol === 'http:' || u.protocol === 'https:') &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const allowed =
      url.startsWith('file:') ||
      (!app.isPackaged && isAllowedDevRendererUrl(url));
    if (!allowed) event.preventDefault();
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (!app.isPackaged && devUrl && isAllowedDevRendererUrl(devUrl)) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  configureAboutPanel();
  const siteStore = new SiteStore(path.join(app.getPath('userData'), 'sites.json'));
  const labelStore = new LabelStore(path.join(app.getPath('userData'), 'labels.json'));
  const updates = initAutoUpdate(
    (status) => win?.webContents.send(CHANNELS.updateStatus, status),
    () => win,
  );
  registerIpc(() => win, siteStore, labelStore, updates);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(buildAppMenuTemplate(() => win, { onCheckForUpdates: () => { void updates.check(); } })),
  );
  createWindow();
  void updates.check();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
