"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CURRENCIES } from "@/lib/currencies";

type Member = { id: string; displayName: string };

export default function AddExpenseForm({
  groupId,
  members,
}: {
  groupId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paidById, setPaidById] = useState(members[0]?.id ?? "");
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE">("EQUAL");
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m.id, true]))
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleIncluded(id: string) {
    setIncluded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }

    let payload: any = {
      description,
      amount: amt,
      currency,
      paidById,
      splitType,
    };

    if (splitType === "EQUAL") {
      const memberIds = members.filter((m) => included[m.id]).map((m) => m.id);
      if (memberIds.length === 0) {
        setError("Select at least one person to split with");
        return;
      }
      payload.memberIds = memberIds;
    } else {
      const splits = members
        .filter((m) => values[m.id])
        .map((m) => ({ groupMemberId: m.id, value: parseFloat(values[m.id]) }));
      if (splits.length === 0) {
        setError("Enter at least one split value");
        return;
      }
      payload.splits = splits;
    }

    setLoading(true);
    const res = await fetch(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't add expense");
      return;
    }
    setDescription("");
    setAmount("");
    setValues({});
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-text">Description</label>
          <input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text">Amount</label>
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-text">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              {ALL_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-text">Paid by</label>
          <select
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
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
          <label className="block text-sm font-medium text-text">Split</label>
          <select
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as any)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            <option value="EQUAL">Equally</option>
            <option value="EXACT">By exact amount</option>
            <option value="PERCENTAGE">By percentage</option>
          </select>
        </div>
      </div>

      {splitType === "EQUAL" ? (
        <div>
          <label className="block text-sm font-medium text-text">Split between</label>
          <div className="mt-1 flex flex-wrap gap-3">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-1.5 text-sm text-text">
                <input
                  type="checkbox"
                  checked={!!included[m.id]}
                  onChange={() => toggleIncluded(m.id)}
                />
                {m.displayName}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-text">
            {splitType === "EXACT" ? "Amount owed per person" : "Percentage owed per person"}
          </label>
          <div className="mt-1 space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="w-32 text-sm text-text-muted">{m.displayName}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values[m.id] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  className="w-28 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                <span className="text-sm text-text-faint">
                  {splitType === "EXACT" ? currency : "%"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}
