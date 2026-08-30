"use client";
import { useRouter } from "next/navigation";
import AuthBackground from "@/components/layout/AuthBackground";

// This screen only matters inside the Electron shell: on first launch,
// before any mode file exists, Electron's main process (electron/main.js)
// loads this route to capture a one-time, permanent choice, then writes its
// own local mode file and never shows this screen again. The web app's mode
// is always hardcoded "online" at build time and never reaches this route
// through normal navigation — it lives here so the UI is visually testable
// in the ordinary dev server too (window.nakama is undefined there, so
// `choose()` just falls back to a plain client-side navigation).
declare global {
  interface Window {
    nakama?: { chooseMode: (mode: "online" | "offline") => Promise<void> };
  }
}

export default function ModeSelectPage() {
  const router = useRouter();

  async function choose(mode: "online" | "offline") {
    if (window.nakama) {
      // Electron's main process takes over navigation from here — it may
      // switch the window to a different server entirely for "online".
      await window.nakama.chooseMode(mode);
      return;
    }
    router.push(mode === "offline" ? "/offline-lock" : "/login");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-2xl">
        <h1 className="mb-1 text-center text-2xl font-semibold text-text">Welcome to Nakama</h1>
        <p className="mb-8 text-center text-sm text-text-muted">
          Choose how you want to use this device. This can't be changed later.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("offline")}
            className="rounded-xl border border-border bg-surface/90 p-6 text-left shadow-lg backdrop-blur-sm transition hover:border-primary"
          >
            <h2 className="mb-1 text-lg font-semibold text-text">Use on this device only</h2>
            <p className="text-sm text-text-muted">
              Everything stays on this computer — no account, no signup. You'll set a PIN to open
              the app instead. People you add are local guests.
            </p>
          </button>
          <button
            type="button"
            onClick={() => choose("online")}
            className="rounded-xl border border-border bg-surface/90 p-6 text-left shadow-lg backdrop-blur-sm transition hover:border-primary"
          >
            <h2 className="mb-1 text-lg font-semibold text-text">Connect to my account</h2>
            <p className="text-sm text-text-muted">
              Log in or sign up for a cloud account. Your data syncs online, and you can link up
              with people who have their own real accounts.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
