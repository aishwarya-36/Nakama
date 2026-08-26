"use client";
import { useState } from "react";
import { ALL_CURRENCIES } from "@/lib/currencies";
import { useToast } from "./ToastProvider";

export interface EditablePerson {
  id: string;
  name: string;
  baseCurrency: string;
  email: string | null;
  upiId: string | null;
}

export default function EditPersonForm({
  person,
  onSaved,
}: {
  person: EditablePerson;
  onSaved: (updated: EditablePerson) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(person.name);
  const [baseCurrency, setBaseCurrency] = useState(person.baseCurrency);
  const [email, setEmail] = useState(person.email || "");
  const [upiId, setUpiId] = useState(person.upiId || "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/people/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        baseCurrency,
        email: email.trim() || undefined,
        upiId: upiId.trim() || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save changes");
      return;
    }
    toast.success("Person updated");
    onSaved({ id: person.id, name: name.trim(), baseCurrency, email: email.trim() || null, upiId: upiId.trim() || null });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-text">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
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
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
