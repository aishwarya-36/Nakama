const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const OFFLINE_PORT = 4173;
const ONLINE_URL = process.env.NAKAMA_ONLINE_URL || "http://localhost:3000";
const MODE_FILE = path.join(app.getPath("userData"), "mode.json");

let mainWindow = null;
let serverProcess = null;
let serverStarted = false;

function standaloneServerPath() {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
  return path.join(base, "standalone", "server.js");
}

function offlineDbTemplatePath() {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  return path.join(base, "resources", "nakama-offline-template.db");
}

// The SQLite file is per-install, created fresh in userData on first run —
// copied from a pre-migrated empty template shipped with the app, rather
// than running Prisma's migration engine at runtime.
function ensureOfflineDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.copyFileSync(offlineDbTemplatePath(), dbPath);
  }
}

function readMode() {
  try {
    return JSON.parse(fs.readFileSync(MODE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeMode(mode) {
  fs.mkdirSync(path.dirname(MODE_FILE), { recursive: true });
  fs.writeFileSync(MODE_FILE, JSON.stringify({ mode, createdAt: new Date().toISOString() }));
}

// Starts the bundled Next server in offline (SQLite) mode. Used both for
// the actual offline runtime and to serve the mode-free-yet screens
// (/mode-select, /offline-lock) that don't depend on which mode is chosen.
function startOfflineServer() {
  if (serverStarted) return Promise.resolve();
  serverStarted = true;
  return new Promise((resolve, reject) => {
    const dbPath = path.join(app.getPath("userData"), "nakama-offline.db");
    ensureOfflineDb(dbPath);
    serverProcess = spawn(process.execPath, [standaloneServerPath()], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        PORT: String(OFFLINE_PORT),
        HOSTNAME: "127.0.0.1",
        NAKAMA_MODE: "offline",
        OFFLINE_DATABASE_URL: `file:${dbPath}`,
        JWT_SECRET: process.env.JWT_SECRET || "nakama-offline-local-secret",
      },
      stdio: "inherit",
    });
    serverProcess.on("error", reject);
    // The child process has no ready signal wired up; a short, generous
    // delay is simpler than a polling readiness check for a local process.
    setTimeout(resolve, 2000);
  });
}

function stopOfflineServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    serverStarted = false;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });

  const existing = readMode();
  if (!existing) {
    await startOfflineServer();
    mainWindow.loadURL(`http://127.0.0.1:${OFFLINE_PORT}/mode-select`);
  } else if (existing.mode === "offline") {
    await startOfflineServer();
    mainWindow.loadURL(`http://127.0.0.1:${OFFLINE_PORT}/`);
  } else {
    mainWindow.loadURL(`${ONLINE_URL}/login`);
  }
}

ipcMain.handle("nakama:choose-mode", async (_event, mode) => {
  writeMode(mode);
  if (mode === "offline") {
    mainWindow.loadURL(`http://127.0.0.1:${OFFLINE_PORT}/offline-lock`);
  } else {
    stopOfflineServer();
    mainWindow.loadURL(`${ONLINE_URL}/login`);
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  stopOfflineServer();
  if (process.platform !== "darwin") app.quit();
});
