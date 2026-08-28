"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { emitSettlementChanged } from "@/lib/events";
import type { Debt } from "@/lib/types";
import { apiPost } from "@/lib/api";

export default function SettleUpForm({ groupId }: { groupId: string }) {
  const toast = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/balances`)
      .then((r) => r.json())
      .then((data) => {
        const list: Debt[] = data.debts || [];
        setDebts(list);
        setAmounts(Object.fromEntries(list.map((d, i) => [i, String(d.amount)])));
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  async function record(i: number) {
    const debt = debts[i];
    const amt = parseFloat(amounts[i]);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > debt.amount + 0.004) {
      toast.error(`Can't exceed ${debt.amount.toFixed(2)} ${debt.currency}`);
      return;
    }
    setSavingIndex(i);
    const result = await apiPost(`/api/groups/${groupId}/settlements`, {
      fromMemberId: debt.fromMemberId,
      toMemberId: debt.toMemberId,
      amount: amt,
      currency: debt.currency,
    });
    setSavingIndex(null);
    if (!result.ok) {
      toast.error(result.error || "Couldn't record payment");
      return;
    }
    toast.success(`Recorded ${debt.fromName} → ${debt.toName}`);
    emitSettlementChanged();
    setDebts((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (loading) return <p className="text-sm text-text-faint">Loading…</p>;
  if (debts.length === 0) return <p className="text-sm text-text-faint">Everyone's settled up.</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-faint">
        Pick a balance to record — you can settle it in full or edit the amount for a partial payment.
      </p>
      {debts.map((d, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border border-border p-3">
          <div className="flex-1 text-sm text-text">
            <span className="font-medium">{d.fromName}</span> owes <span className="font-medium">{d.toName}</span>
            <div className="text-xs text-text-faint">Up to {d.amount.toFixed(2)} {d.currency}</div>
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={d.amount}
            value={amounts[i] ?? ""}
            onChange={(e) => setAmounts((prev) => ({ ...prev, [i]: e.target.value }))}
            className="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <span className="text-sm text-text-faint">{d.currency}</span>
          <button
            type="button"
            onClick={() => record(i)}
            disabled={savingIndex === i}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            Record
          </button>
        </div>
      ))}
    </div>
  );
}
