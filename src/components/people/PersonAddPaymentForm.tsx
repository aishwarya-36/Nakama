"use client";
import { useEffect, useState } from "react";
import CurrencySelect from "@/components/ui/CurrencySelect";
import { useToast } from "@/components/ui/ToastProvider";
import { emitSettlementChanged } from "@/lib/events";
import { apiPost } from "@/lib/api";

interface Context {
  groupId: string;
  groupName: string;
  isPersonal: boolean;
}

export default function PersonAddPaymentForm({
  contactId,
  contactName,
  defaultCurrency,
  onDone,
}: {
  contactId: string;
  contactName: string;
  defaultCurrency: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [direction, setDirection] = useState<"youPaidThem" | "theyPaidYou">("youPaidThem");
  const [groupId, setGroupId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/people/${contactId}/debts`)
      .then((r) => r.json())
      .then((data) => {
        const list: Context[] = data.contexts || [];
        setContexts(list);
        const direct = list.find((c) => c.isPersonal);
        setGroupId(direct?.groupId || list[0]?.groupId || "");
      });
  }, [contactId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    const result = await apiPost(`/api/people/${contactId}/payments`, {
      amount: amt,
      currency,
      note: note.trim() || undefined,
      direction,
      groupId: contexts.length > 1 ? groupId || undefined : undefined,
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
      <div>
        <label className="block text-sm font-medium text-text">Who paid</label>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "youPaidThem" | "theyPaidYou")}
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        >
          <option value="youPaidThem">You paid {contactName}</option>
          <option value="theyPaidYou">{contactName} paid you</option>
        </select>
      </div>

      {contexts.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-text">In</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            {contexts.map((c) => (
              <option key={c.groupId} value={c.groupId}>
                {c.groupName}
              </option>
            ))}
          </select>
        </div>
      )}

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
