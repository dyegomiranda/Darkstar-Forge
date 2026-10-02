/**
 * Void Sun — processo principal do Electron.
 *
 * Seguro por padrão: isolamento de contexto, sandbox, sem Node na página.
 * O app compilado (dist/) é servido pelo protocolo próprio app://forge/,
 * então os dados ficam numa origem fixa (não se perdem entre versões).
 */
const { app, BrowserWindow, protocol, net, shell, Menu, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.FORGE_DEV_URL; // ex.: http://localhost:5173 (desenvolvimento)
const DIST = path.join(__dirname, '..', 'dist');

// O jogo mudou de nome (era Darkstar Forge), mas os dados continuam na mesma pasta:
// heróis, decks e artes de quem já usava o programa não se perdem.
app.setName('Void Sun');
// (VOIDSUN_DATA aponta para outra pasta: usado nos testes, para não tocar nos dados de verdade)
app.setPath('userData', process.env.VOIDSUN_DATA || path.join(app.getPath('appData'), 'darkstar-forge'));

// a música do jogo pode começar sem esperar um clique
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

const COMFY = process.env.FORGE_COMFY_URL || 'http://127.0.0.1:8188';

async function comfy(req, rest) {
  try {
    const init = { method: req.method, headers: {} };
    if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = await req.arrayBuffer(); init.headers['Content-Type'] = 'application/json'; }
    return await net.fetch(COMFY + rest, init);
  } catch {
    return new Response('ComfyUI fora do ar', { status: 502 });
  }
}

function serveApp() {
  protocol.handle('app', (req) => {
    const { pathname, search } = new URL(req.url);
    // atalho para o ComfyUI do próprio computador (gerar artes de dentro do app)
    if (pathname.startsWith('/__comfy/')) return comfy(req, pathname.slice('/__comfy'.length) + search);
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('Proibido', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

// ───────────── janela: modo, tamanho e escala (guardados para a próxima abertura) ─────────────

const WINDOW_FILE = () => path.join(app.getPath('userData'), 'janela.json');
const MODES = ['windowed', 'maximized', 'fullscreen'];
function readWindow() {
  const base = { mode: 'maximized', width: 1600, height: 900, zoom: 1 };
  try {
    const s = JSON.parse(fs.readFileSync(WINDOW_FILE(), 'utf8'));
    return {
      mode: MODES.includes(s.mode) ? s.mode : base.mode,
      width: Number.isFinite(s.width) ? Math.max(900, Math.min(7680, Math.round(s.width))) : base.width,
      height: Number.isFinite(s.height) ? Math.max(600, Math.min(4320, Math.round(s.height))) : base.height,
      zoom: Number.isFinite(s.zoom) ? Math.max(0.6, Math.min(2, s.zoom)) : base.zoom,
    };
  } catch { return base; }
}
let state = null;
function saveWindow() { try { fs.writeFileSync(WINDOW_FILE(), JSON.stringify(state)); } catch { /* sem permissão de escrita: fica só nesta sessão */ } }

/** Faz `then` quando a janela avisar `event` (ou depois de um instante, se o aviso não vier). */
function after(win, event, act, then) {
  let done = false;
  const go = () => { if (done || win.isDestroyed()) return; done = true; then(); };
  win.once(event, go);
  act();
  setTimeout(go, 500);
}

function applyMode(win) {
  if (state.mode === 'fullscreen') { win.setFullScreen(true); return; }
  // sair da tela cheia (ou de maximizada) leva um instante: o novo modo só entra depois que a janela termina de sair
  if (win.isFullScreen()) { after(win, 'leave-full-screen', () => win.setFullScreen(false), () => applyMode(win)); return; }
  if (state.mode === 'maximized') {
    // no Wayland a janela às vezes ainda "se acha" maximizada depois de encolher, e aí maximizar não faz nada.
    // Passar pela tela cheia e soltar a janela põe o estado em dia (testado: é o caminho que maximiza de novo).
    const area = screen.getDisplayMatching(win.getBounds()).workAreaSize;
    const small = win.getContentSize()[0] < area.width * 0.95;
    if (win.isMaximized() && small) {
      after(win, 'enter-full-screen', () => win.setFullScreen(true), () =>
        after(win, 'leave-full-screen', () => win.setFullScreen(false), () =>
          after(win, 'unmaximize', () => win.unmaximize(), () => { if (state.mode === 'maximized') win.maximize(); })));
    } else if (!win.isMaximized()) win.maximize();
    return;
  }
  const size = () => { win.setContentSize(state.width, state.height); win.center(); };
  if (win.isMaximized()) after(win, 'unmaximize', () => win.unmaximize(), size);
  else size();
}
/** Modo em que a janela está de fato (maximizada só conta se ela ocupa mesmo a área da tela). */
function modeOf(win) {
  if (win.isFullScreen()) return 'fullscreen';
  const area = screen.getDisplayMatching(win.getBounds()).workAreaSize;
  return win.isMaximized() && win.getContentSize()[0] >= area.width * 0.95 ? 'maximized' : 'windowed';
}

function createWindow() {
  state = readWindow();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    useContentSize: true,
    minWidth: 900,
    minHeight: 600,
    title: 'Void Sun',
    backgroundColor: '#07060c',
    icon: path.join(__dirname, '..', 'public', 'brand', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    fullscreen: state.mode === 'fullscreen',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  win.once('ready-to-show', () => { applyMode(win); win.webContents.setZoomFactor(state.zoom); win.show(); });
  // o modo mudou por fora (F11, botão de maximizar): a tela de configurações acompanha
  const tell = () => { if (!win.isDestroyed()) win.webContents.send('vs:mode', modeOf(win)); };
  for (const ev of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) win.on(ev, tell);
  // F11 e Alt+Enter alternam a tela cheia
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      e.preventDefault();
      state.mode = win.isFullScreen() ? 'maximized' : 'fullscreen';
      applyMode(win);
      saveWindow();
    }
  });
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

// só a janela do próprio jogo pode pedir estas coisas
const own = (e) => { const w = BrowserWindow.fromWebContents(e.sender); return w && !w.isDestroyed() ? w : null; };
ipcMain.handle('vs:display', (e, o) => {
  const win = own(e);
  if (!win || !o || !MODES.includes(o.mode)) return;
  state.mode = o.mode;
  if (Number.isFinite(o.width) && Number.isFinite(o.height)) { state.width = Math.max(900, Math.round(o.width)); state.height = Math.max(600, Math.round(o.height)); }
  applyMode(win);
  saveWindow();
});
ipcMain.handle('vs:zoom', (e, z) => {
  const win = own(e);
  if (!win || !Number.isFinite(z)) return;
  state.zoom = Math.max(0.6, Math.min(2, z));
  win.webContents.setZoomFactor(state.zoom);
  saveWindow();
});
ipcMain.handle('vs:info', (e) => {
  const win = own(e);
  const d = screen.getPrimaryDisplay();
  return { width: d.size.width, height: d.size.height, mode: win ? modeOf(win) : 'windowed' };
});
ipcMain.on('vs:quit', (e) => { if (own(e)) app.quit(); });

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
