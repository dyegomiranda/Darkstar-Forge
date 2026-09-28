/**
 * Darkstar Forge — processo principal do Electron.
 *
 * Seguro por padrão: isolamento de contexto, sandbox, sem Node na página.
 * O app compilado (dist/) é servido pelo protocolo próprio app://forge/,
 * então os dados ficam numa origem fixa (não se perdem entre versões).
 */
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.FORGE_DEV_URL; // ex.: http://localhost:5173 (desenvolvimento)
const DIST = path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

function serveApp() {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('Proibido', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: 'Darkstar Forge',
    backgroundColor: '#0c0b0a',
    icon: path.join(__dirname, '..', 'public', 'brand', 'logo.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  win.once('ready-to-show', () => win.show());
  // links externos (créditos) abrem no navegador do sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://') && !(DEV_URL && url.startsWith(DEV_URL))) e.preventDefault();
  });
  void win.loadURL(DEV_URL ?? 'app://forge/index.html');
}

// Uma janela só: duas cópias abertas disputariam o banco de dados.
// Abrir de novo apenas traz a janela existente para a frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

app.whenReady().then(() => {
  if (!DEV_URL) Menu.setApplicationMenu(null);
  serveApp();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
