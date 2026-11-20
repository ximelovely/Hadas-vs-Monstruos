const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 520,
    minHeight: 420,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  window.loadFile(path.join(__dirname, "index.html"));

  window.on("enter-full-screen", () => {
    window.webContents.send("window:fullscreen-change", true);
  });
  window.on("leave-full-screen", () => {
    window.webContents.send("window:fullscreen-change", false);
  });
}

ipcMain.handle("window:is-fullscreen", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window ? window.isFullScreen() : false;
});

ipcMain.on("window:toggle-fullscreen", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.setFullScreen(!window.isFullScreen());
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
