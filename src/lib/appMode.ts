export type AppMode = "online" | "offline";

// Web deployments hardcode NAKAMA_MODE=online at build time — the offline
// branch (and its SQLite client) should never be reachable from a web
// request. The Electron shell overrides this at runtime from its own
// locked mode file before starting the Next server.
export function getAppMode(): AppMode {
  return process.env.NAKAMA_MODE === "offline" ? "offline" : "online";
}

// Where an unauthenticated request should land — offline mode has no
// signup, just a PIN gate, so it never sends anyone to /login or /register.
export function getAuthPagePath(): "/login" | "/offline-lock" {
  return getAppMode() === "offline" ? "/offline-lock" : "/login";
}
