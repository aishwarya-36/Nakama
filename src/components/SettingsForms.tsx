"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CURRENCIES } from "@/lib/currencies";
import { apiPost } from "@/lib/api";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-medium text-text">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Message({ text, tone }: { text: string; tone: "error" | "success" }) {
  return <p className={`text-sm ${tone === "error" ? "text-error" : "text-success-text"}`}>{text}</p>;
}

export default function SettingsForms({
  initialEmail,
  initialBaseCurrency,
}: {
  initialEmail: string;
  initialBaseCurrency: string;
}) {
  return (
    <div className="space-y-6">
      <BaseCurrencySection initial={initialBaseCurrency} />
      <ChangeEmailSection initial={initialEmail} />
      <ChangePasswordSection />
    </div>
  );
}

function BaseCurrencySection({ initial }: { initial: string }) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initial);
  const [status, setStatus] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const result = await apiPost("/api/user/currency", { baseCurrency: currency });
    setLoading(false);
    if (!result.ok) {
      setStatus({ text: result.error || "Couldn't update", tone: "error" });
      return;
    }
    setStatus({ text: "Base currency updated.", tone: "success" });
    router.refresh();
  }

  return (
    <Section
      title="Base currency"
      description="Used as your default 'show in' currency for balances and personal insights."
    >
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-text">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 w-48 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
      {status && (
        <div className="mt-2">
          <Message text={status.text} tone={status.tone} />
        </div>
      )}
    </Section>
  );
}

function ChangeEmailSection({ initial }: { initial: string }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState(initial);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const result = await apiPost("/api/user/email", { newEmail, password });
    setLoading(false);
    if (!result.ok) {
      setStatus({ text: result.error || "Couldn't update", tone: "error" });
      return;
    }
    setPassword("");
    setStatus({ text: "Email updated.", tone: "success" });
    router.refresh();
  }

  return (
    <Section title="Email" description="Confirm your password to change the email you log in with.">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text">New email</label>
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text">Current password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>
        {status && <Message text={status.text} tone={status.tone} />}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update email"}
        </button>
      </form>
    </Section>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const result = await apiPost("/api/user/password", { currentPassword, newPassword });
    setLoading(false);
    if (!result.ok) {
      setStatus({ text: result.error || "Couldn't update", tone: "error" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setStatus({ text: "Password updated.", tone: "success" });
  }

  return (
    <Section title="Password">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text">Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <p className="mt-1 text-xs text-text-faint">At least 8 characters.</p>
        </div>
        {status && <Message text={status.text} tone={status.tone} />}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </Section>
  );
}
