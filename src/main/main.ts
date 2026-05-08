/**
 * Electron main process entry point.
 *
 * Responsibilities:
 * - Create and manage the BrowserWindow
 * - Register all IPC handlers
 * - Apply security policy (CSP in production, DevTools in development)
 * - Handle platform-specific lifecycle (macOS re-activate, Windows/Linux quit)
 *
 * Security posture:
 * - nodeIntegration: false  — renderer has no direct Node.js access
 * - contextIsolation: true  — preload context is isolated from renderer
 * - sandbox: true           — renderer is OS-sandboxed; preload is bundled
 * - External URLs are opened in the default OS browser, never in Electron
 */

import { app, BrowserWindow, shell, session } from 'electron';
import * as path from 'path';
import { registerAllIPCHandlers } from './ipc';

const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0f172a', // matches dark theme --color-bg; avoids white flash
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // ── Load the Angular app ───────────────────────────────────────────────────
  if (isDev) {
    // Dev: Angular CLI serves on localhost with HMR
    void win.loadURL('http://localhost:4200');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Prod: Angular builds to dist/renderer/browser/
    void win.loadFile(
      path.join(__dirname, '../renderer/browser/index.html'),
    );
  }

  // ── Security: Content-Security-Policy (production only) ───────────────────
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'", // Angular inlines some styles
              "font-src 'self' data:",
              "img-src 'self' data:",
              "connect-src 'self'",
            ].join('; '),
          ],
        },
      });
    });
  }

  // ── Show window only when ready (avoids white flash) ─────────────────────
  win.once('ready-to-show', () => win.show());

  // ── Block window.open; route http(s) links to the OS browser ─────────────
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return win;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerAllIPCHandlers();
  createWindow();

  // macOS: re-create window when the dock icon is clicked with no open windows
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, applications conventionally stay active until the user quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
