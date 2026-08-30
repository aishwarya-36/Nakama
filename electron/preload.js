const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nakama", {
  chooseMode: (mode) => ipcRenderer.invoke("nakama:choose-mode", mode),
});
