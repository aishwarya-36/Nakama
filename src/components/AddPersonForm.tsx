"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CURRENCIES } from "@/lib/currencies";
import { useToast } from "./ToastProvider";

export default function AddPersonForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), baseCurrency }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't add person");
      return;
    }
    toast.success(`${name.trim()} added`);
    setName("");
    onSuccess?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
      />
      <select
        value={baseCurrency}
        onChange={(e) => setBaseCurrency(e.target.value)}
        title="This person's base currency"
        className="w-24 rounded-md border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
      >
        {ALL_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-tint disabled:opacity-60"
      >
        Add
      </button>
    </form>
  );
}
