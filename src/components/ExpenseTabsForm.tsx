"use client";
import { useEffect, useState } from "react";
import CurrencySelect from "./CurrencySelect";
import CategoryPicker from "./CategoryPicker";
import { useToast } from "./ToastProvider";

export interface Participant {
  ref: string;
  label: string;
}

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface ExpensePayload {
  description: string;
  amount: number;
  currency: string;
  category: string;
  notes: string;
  date: string;
  splitType: SplitType;
  payers: { ref: string; value: number }[];
  memberIds?: string[];
  splits?: { ref: string; value: number }[];
}

const TABS = ["Details", "Paid by", "Split"] as const;

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function roundCents(n: number) {
  return Math.round(n * 100) / 100;
}

export default function ExpenseTabsForm({
  participants,
  defaultCurrency = "USD",
  detailsExtra,
  onSubmit,
  onSuccess,
}: {
  participants: Participant[];
  defaultCurrency?: string;
  detailsExtra?: React.ReactNode;
  onSubmit: (payload: ExpensePayload) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISODate());

  const defaultRef = participants[0]?.ref || "";
  const [payerRefs, setPayerRefs] = useState<string[]>(defaultRef ? [defaultRef] : []);
  const [payerValues, setPayerValues] = useState<Record<string, string>>({});

  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(participants.map((p) => [p.ref, true]))
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  // Keep a lone payer's amount tracking the total — the common case is one payer.
  useEffect(() => {
    if (payerRefs.length === 1) {
      setPayerValues((prev) => ({ ...prev, [payerRefs[0]]: amount }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  // New participants (e.g. added via "With") default to included in an EQUAL split.
  useEffect(() => {
    setIncluded((prev) => {
      const next = { ...prev };
      for (const p of participants) if (!(p.ref in next)) next[p.ref] = true;
      return next;
    });
    if (!payerRefs.length && defaultRef) setPayerRefs([defaultRef]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.map((p) => p.ref).join(",")]);

  function togglePayer(ref: string) {
    setPayerRefs((prev) => {
      if (prev.includes(ref)) return prev.filter((r) => r !== ref);
      return [...prev, ref];
    });
  }
  function addPayerRow() {
    const next = participants.find((p) => !payerRefs.includes(p.ref));
    if (next) setPayerRefs((prev) => [...prev, next.ref]);
  }

  const payerSum = roundCents(payerRefs.reduce((sum, ref) => sum + (parseFloat(payerValues[ref]) || 0), 0));
  const amountNum = parseFloat(amount) || 0;
  const payerRemaining = roundCents(amountNum - payerSum);

  function toggleIncluded(ref: string) {
    setIncluded((prev) => ({ ...prev, [ref]: !prev[ref] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      setTab(0);
      return;
    }
    if (!description.trim()) {
      toast.error("Enter a description");
      setTab(0);
      return;
    }

    const payers = payerRefs
      .filter((ref) => payerValues[ref])
      .map((ref) => ({ ref, value: parseFloat(payerValues[ref]) || 0 }));
    if (payers.length === 0) {
      toast.error("Add at least one payer");
      setTab(1);
      return;
    }
    if (Math.abs(payerRemaining) > 0.004) {
      toast.error(`Payments must add up to the total (${payerRemaining > 0 ? "short" : "over"} by ${Math.abs(payerRemaining).toFixed(2)})`);
      setTab(1);
      return;
    }

    const payload: ExpensePayload = {
      description: description.trim(),
      amount: amt,
      currency,
      category,
      notes: notes.trim(),
      date: new Date(date + "T00:00:00.000Z").toISOString(),
      splitType,
      payers,
    };

    if (splitType === "EQUAL") {
      const refs = participants.filter((p) => included[p.ref]).map((p) => p.ref);
      if (refs.length === 0) {
        toast.error("Select at least one person to split with");
        setTab(2);
        return;
      }
      payload.memberIds = refs;
    } else {
      const splits = participants
        .filter((p) => splitValues[p.ref])
        .map((p) => ({ ref: p.ref, value: parseFloat(splitValues[p.ref]) || 0 }));
      if (splits.length === 0) {
        toast.error("Enter at least one split value");
        setTab(2);
        return;
      }
      payload.splits = splits;
    }

    setLoading(true);
    const result = await onSubmit(payload);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't add expense");
      return;
    }
    toast.success("Expense added");
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === i ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-lg tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
            <div className="mt-2">
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </div>

          {detailsExtra}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering"
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text">Category</label>
            <div className="mt-1">
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-text-faint">Add each person who paid, and how much — it must add up to the total.</p>
          {payerRefs.map((ref) => {
            const p = participants.find((pp) => pp.ref === ref);
            return (
              <div key={ref} className="flex items-center gap-2">
                <select
                  value={ref}
                  onChange={(e) => {
                    const newRef = e.target.value;
                    setPayerRefs((prev) => prev.map((r) => (r === ref ? newRef : r)));
                    setPayerValues((prev) => {
                      const { [ref]: old, ...rest } = prev;
                      return { ...rest, [newRef]: old || "" };
                    });
                  }}
                  className="w-40 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                >
                  {participants.map((pp) => (
                    <option key={pp.ref} value={pp.ref} disabled={pp.ref !== ref && payerRefs.includes(pp.ref)}>
                      {pp.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payerValues[ref] || ""}
                  onChange={(e) => setPayerValues((prev) => ({ ...prev, [ref]: e.target.value }))}
                  className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                <span className="text-sm text-text-faint">{currency}</span>
                {payerRefs.length > 1 && (
                  <button type="button" onClick={() => togglePayer(ref)} className="px-1 text-sm text-text-faint hover:text-error">
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {payerRefs.length < participants.length && (
            <button type="button" onClick={addPayerRow} className="text-sm font-medium text-primary hover:underline">
              + Add another payer
            </button>
          )}
          <p className={`text-xs ${Math.abs(payerRemaining) > 0.004 ? "text-error" : "text-success-text"}`}>
            {Math.abs(payerRemaining) > 0.004
              ? `Remaining to assign: ${payerRemaining.toFixed(2)} ${currency}`
              : "Fully assigned"}
          </p>
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Split</label>
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as SplitType)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              <option value="EQUAL">Equally</option>
              <option value="EXACT">By exact amount</option>
              <option value="PERCENTAGE">By percentage</option>
              <option value="SHARES">By shares</option>
            </select>
          </div>

          {splitType === "EQUAL" ? (
            <div>
              <label className="block text-sm font-medium text-text">Split between</label>
              <div className="mt-1 flex flex-wrap gap-3">
                {participants.map((p) => (
                  <label key={p.ref} className="flex items-center gap-1.5 text-sm text-text">
                    <input type="checkbox" checked={!!included[p.ref]} onChange={() => toggleIncluded(p.ref)} />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text">
                {splitType === "EXACT" ? "Amount owed per person" : splitType === "PERCENTAGE" ? "Percentage owed per person" : "Shares per person"}
              </label>
              <div className="mt-1 space-y-2">
                {participants.map((p) => (
                  <div key={p.ref} className="flex items-center gap-2">
                    <span className="w-32 text-sm text-text-muted">{p.label}</span>
                    <input
                      type="number"
                      step={splitType === "SHARES" ? "1" : "0.01"}
                      min="0"
                      value={splitValues[p.ref] || ""}
                      onChange={(e) => setSplitValues((prev) => ({ ...prev, [p.ref]: e.target.value }))}
                      className="w-28 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                    />
                    <span className="text-sm text-text-faint">
                      {splitType === "EXACT" ? currency : splitType === "PERCENTAGE" ? "%" : "shares"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setTab((t) => Math.max(0, t - 1))}
          disabled={tab === 0}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-border-strong hover:text-text disabled:opacity-40"
        >
          Back
        </button>
        {tab < 2 ? (
          <button
            type="button"
            onClick={() => setTab((t) => Math.min(2, t + 1))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "Adding…" : "Add expense"}
          </button>
        )}
      </div>
    </form>
  );
}
