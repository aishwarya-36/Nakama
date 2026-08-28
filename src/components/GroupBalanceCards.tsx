"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import CurrencySelect from "./CurrencySelect";
import { useToast } from "./ToastProvider";

interface Data {
  owed: number;
  owe: number;
  byCurrency: Record<string, { owedToYou: number; youOwe: number }>;
  skippedCurrencies: string[];
  baseCurrency: string;
}

interface Debt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
}

type Member = { id: string; displayName: string };

const BREAKDOWN_LIMIT = 2;

export default function GroupBalanceCards({
  groupId,
  members,
  defaultCurrency,
}: {
  groupId: string;
  members: Member[];
  defaultCurrency: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [expanded, setExpanded] = useState<{ label: string; breakdown: { currency: string; value: number }[] } | null>(
    null
  );
  const [settleOpen, setSettleOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  function load() {
    fetch(`/api/groups/${groupId}/my-balance`)
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    load();
    window.addEventListener("nakama:settlement-changed", load);
    return () => window.removeEventListener("nakama:settlement-changed", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  if (!data) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface-secondary" />
        ))}
      </div>
    );
  }

  const currencyEntries = Object.entries(data.byCurrency);
  const cards = [
    {
      label: "You are owed",
      value: data.owed,
      tone: "text-success-text",
      breakdown: currencyEntries
        .map(([currency, b]) => ({ currency, value: b.owedToYou }))
        .filter((e) => e.value > 0.005),
    },
    {
      label: "You owe",
      value: data.owe,
      tone: "text-error",
      breakdown: currencyEntries.map(([currency, b]) => ({ currency, value: b.youOwe })).filter((e) => e.value > 0.005),
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="text-sm text-text-muted">{c.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${c.tone}`}>
              {c.value.toFixed(2)} <span className="text-sm font-normal">{data.baseCurrency}</span>
            </div>
            {c.breakdown.length > 0 &&
              !(c.breakdown.length === 1 && c.breakdown[0].currency === data.baseCurrency) && (
                <div className="mt-1 space-y-0.5 text-xs text-text-faint">
                  {c.breakdown.slice(0, BREAKDOWN_LIMIT).map((e) => (
                    <div key={e.currency}>
                      {e.value.toFixed(2)} {e.currency}
                    </div>
                  ))}
                  {c.breakdown.length > BREAKDOWN_LIMIT && (
                    <button
                      onClick={() => setExpanded({ label: c.label, breakdown: c.breakdown })}
                      className="text-text-faint underline hover:text-text-muted"
                    >
                      +{c.breakdown.length - BREAKDOWN_LIMIT} more
                    </button>
                  )}
                </div>
              )}
          </div>
        ))}
      </div>

      {data.skippedCurrencies.length > 0 && (
        <p className="mt-2 text-xs text-text-faint">
          Couldn't convert some balances in {data.skippedCurrencies.join(", ")} — no exchange rate on file for
          those yet.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setSettleOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-border-strong"
        >
          Settle up
        </button>
        <button
          onClick={() => setPayOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-border-strong"
        >
          + Add payment
        </button>
      </div>

      <Modal open={expanded !== null} onClose={() => setExpanded(null)} title={expanded?.label || ""}>
        <div className="space-y-2">
          {expanded?.breakdown.map((e) => (
            <div key={e.currency} className="flex items-center justify-between text-sm text-text">
              <span className="text-text-muted">{e.currency}</span>
              <span className="font-medium">{e.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={settleOpen} onClose={() => setSettleOpen(false)} title="Settle up">
        <SettleUpForm groupId={groupId} />
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Add payment">
        <AddPaymentForm groupId={groupId} members={members} defaultCurrency={defaultCurrency} onDone={() => setPayOpen(false)} />
      </Modal>
    </div>
  );
}

function SettleUpForm({ groupId }: { groupId: string }) {
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
    const res = await fetch(`/api/groups/${groupId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromMemberId: debt.fromMemberId,
        toMemberId: debt.toMemberId,
        amount: amt,
        currency: debt.currency,
      }),
    });
    setSavingIndex(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't record payment");
      return;
    }
    toast.success(`Recorded ${debt.fromName} → ${debt.toName}`);
    window.dispatchEvent(new Event("nakama:settlement-changed"));
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

function AddPaymentForm({
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
    const res = await fetch(`/api/groups/${groupId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMemberId: fromId, toMemberId: toId, amount: amt, currency, note: note.trim() || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't record payment");
      return;
    }
    toast.success("Payment recorded");
    window.dispatchEvent(new Event("nakama:settlement-changed"));
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
