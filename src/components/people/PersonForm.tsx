"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CURRENCIES } from "@/lib/currencies";
import { useToast } from "@/components/ui/ToastProvider";
import { apiPost, apiPatch } from "@/lib/api";

export interface EditablePerson {
  id: string;
  name: string;
  baseCurrency: string;
  email: string | null;
  upiId: string | null;
}

export default function PersonForm({
  person,
  onSuccess,
  onSaved,
  onLinked,
}: {
  person?: EditablePerson;
  onSuccess?: () => void;
  onSaved?: (updated: EditablePerson) => void;
  // Fires only in edit mode, after a successful account link — the person's
  // Contact id no longer exists at that point (see /api/people/[id]/link),
  // so the caller needs to redirect rather than refresh in place.
  onLinked?: (linkedUserId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!person;
  const [name, setName] = useState(person?.name || "");
  const [baseCurrency, setBaseCurrency] = useState(person?.baseCurrency || "USD");
  const [email, setEmail] = useState(person?.email || "");
  const [upiId, setUpiId] = useState(person?.upiId || "");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState<{ status: "idle" | "linked" | "error"; message?: string }>({
    status: "idle",
  });

  function onEmailChange(v: string) {
    setEmail(v);
    setLinkResult({ status: "idle" });
  }

  async function handleLink() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLinking(true);
    if (isEdit && person) {
      const result = await apiPost<{ linkedUserId: string }>(`/api/people/${person.id}/link`, { email: trimmed });
      setLinking(false);
      if (!result.ok) {
        setLinkResult({ status: "error", message: result.error || "Couldn't link" });
        return;
      }
      toast.success("Linked to their account");
      onLinked?.(result.data!.linkedUserId);
    } else {
      const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json().catch(() => ({ exists: false }));
      setLinking(false);
      if (!data.exists) {
        setLinkResult({ status: "error", message: "No account found with that email" });
        return;
      }
      setLinkResult({ status: "linked", message: `Linked to ${data.name}` });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const body = {
      name: name.trim(),
      baseCurrency,
      email: email.trim() || undefined,
      upiId: upiId.trim() || undefined,
    };
    const result = person ? await apiPatch(`/api/people/${person.id}`, body) : await apiPost("/api/people", body);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || (isEdit ? "Couldn't save changes" : "Couldn't add person"));
      return;
    }

    if (person) {
      toast.success("Person updated");
      onSaved?.({ id: person.id, name: name.trim(), baseCurrency, email: email.trim() || null, upiId: upiId.trim() || null });
    } else {
      toast.success(`${name.trim()} added`);
      setName("");
      setEmail("");
      setUpiId("");
      onSuccess?.();
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-text">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text">Currency</label>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            title="This person's base currency"
            className="mt-1 w-24 rounded-md border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text">Email (optional)</label>
        <div className="mt-1 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={handleLink}
            disabled={!email.trim() || linking}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:border-border-strong disabled:opacity-60"
          >
            {linking ? "Checking…" : "Link"}
          </button>
        </div>
        {linkResult.status === "linked" && <p className="mt-1 text-xs text-success-text">✓ {linkResult.message}</p>}
        {linkResult.status === "error" && <p className="mt-1 text-xs text-error">{linkResult.message}</p>}
        {isEdit && (
          <p className="mt-1 text-xs text-text-faint">
            Linking connects this person's existing groups and expenses to their real account.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text">UPI ID (optional)</label>
        <input
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="name@bank"
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? (isEdit ? "Saving…" : "Adding…") : isEdit ? "Save changes" : "Add person"}
      </button>
    </form>
  );
}
