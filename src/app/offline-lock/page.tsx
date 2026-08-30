"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthBackground from "@/components/layout/AuthBackground";

export default function OfflineLockPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasLocalUser, setHasLocalUser] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/offline-status")
      .then((res) => res.json())
      .then((data) => setHasLocalUser(!!data.hasLocalUser))
      .finally(() => setChecking(false));
  }, []);

  async function onSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/offline-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, pin }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/offline-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Incorrect PIN");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <AuthBackground />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface/90 p-6 shadow-lg backdrop-blur-sm">
        {hasLocalUser ? (
          <>
            <h1 className="mb-1 text-2xl font-semibold text-text">Welcome back</h1>
            <p className="mb-6 text-sm text-text-muted">Enter your PIN to unlock Nakama.</p>
            <form onSubmit={onUnlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">PIN</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {loading ? "Unlocking…" : "Unlock"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-semibold text-text">Set up Nakama</h1>
            <p className="mb-6 text-sm text-text-muted">
              This device stores everything locally. Choose a PIN to protect it — there's no
              account to sign up for.
            </p>
            <form onSubmit={onSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Your name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="You"
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text">PIN</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                <p className="mt-1 text-xs text-text-faint">At least 4 characters.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text">Confirm PIN</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {loading ? "Setting up…" : "Set PIN and continue"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
