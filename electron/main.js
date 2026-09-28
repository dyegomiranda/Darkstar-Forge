/* ==========================================================
   Darkstar Forge — Electron main process
========================================================== */

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Hardware acceleration flags para Wayland
app.commandLine.appendSwitch("enable-features", "UseSkiaRenderer");
app.commandLine.appendSwitch("disable-software-rasterizer");

let mainWindow = null;
/** Quando true, o próximo close não pergunta (usuário já confirmou). */
let allowClose = false;

function createWindow() {
  allowClose = false;
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

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const index = path.join(__dirname, "..", "index.html");
  mainWindow.loadFile(index);

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      mainWindow.webContents.toggleDevTools();
    }
  });

  /**
   * Fechar janela com alterações não salvas:
   * intercepta close → pergunta ao renderer → modal Sair/Salvar/Cancelar.
   */
  mainWindow.on("close", (e) => {
    if (allowClose || !mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    e.preventDefault();

    mainWindow.webContents
      .executeJavaScript(
        `typeof AppUI !== "undefined" && AppUI.handleAppClose
          ? AppUI.handleAppClose()
          : true`,
        true
      )
      .then((ok) => {
        if (ok) {
          allowClose = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close();
          }
        }
      })
      .catch((err) => {
        console.error("handleAppClose failed:", err);
        // Em caso de erro no renderer, permite fechar para não prender o app
        allowClose = true;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
        }
      });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    allowClose = false;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
