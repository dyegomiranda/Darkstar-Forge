/* ==========================================================
   Darkstar Forge — Electron main process
========================================================== */

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Hardware acceleration flags para Wayland
app.commandLine.appendSwitch("enable-features", "UseSkiaRenderer");
app.commandLine.appendSwitch("disable-software-rasterizer");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    center: true,
    title: "Darkstar Forge",
    icon: path.join(__dirname, "..", "assets", "icons", "set", "logo.png"),
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Só mostra quando terminar de carregar (evita flash branco)
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Carrega o index.html local
  const index = path.join(__dirname, "..", "index.html");
  mainWindow.loadFile(index);

  // Ctrl+Shift+I para DevTools
  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
