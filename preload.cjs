const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isFullscreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  toggleFullscreen: () => ipcRenderer.send("window:toggle-fullscreen"),
  onFullscreenChange: (callback) => {
    const listener = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("window:fullscreen-change", listener);
    return () => ipcRenderer.removeListener("window:fullscreen-change", listener);
  }
});
