"use client";
import { useState } from "react";
import CurrencySelect from "@/components/ui/CurrencySelect";
import { useToast } from "@/components/ui/ToastProvider";
import { emitSettlementChanged } from "@/lib/events";
import type { Member } from "@/lib/types";
import { apiPost } from "@/lib/api";

export default function AddPaymentForm({
  groupId,
  members,
  defaultCurrency,
  onDone,
}: {
  groupId: string;
  members: Member[];
  defaultCurrency: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [fromId, setFromId] = useState(members[0]?.id || "");
  const [toId, setToId] = useState(members[1]?.id || members[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (fromId === toId) {
      toast.error("Pick two different people");
      return;
    }
    setLoading(true);
    const result = await apiPost(`/api/groups/${groupId}/settlements`, {
      fromMemberId: fromId,
      toMemberId: toId,
      amount: amt,
      currency,
      note: note.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't record payment");
      return;
    }
    toast.success("Payment recorded");
    emitSettlementChanged();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-xs text-text-faint">
        Record any payment between two people in this group — it counts against an existing debt, or stands as
        an advance if there isn't one yet.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-text">From</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text">To</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text">Amount</label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-12 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-lg tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Cash, Venmo…"
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Recording…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
