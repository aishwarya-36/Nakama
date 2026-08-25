"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CURRENCIES } from "@/lib/currencies";
import PersonPicker, { PersonValue } from "./PersonPicker";
import { useToast } from "./ToastProvider";

// A participant is "me" or "person:<index into people[]>" — same ref scheme
// the /api/expenses route expects, so the payload can be sent as-is.
export default function AddDirectExpenseForm({
  userName,
  onSuccess,
}: {
  userName: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [people, setPeople] = useState<PersonValue[]>([{ name: "", baseCurrency: "USD" }]);
  const [paidBy, setPaidBy] = useState("me");
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE">("EQUAL");
  const [included, setIncluded] = useState<Record<string, boolean>>({ me: true, "person:0": true });
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const activePeople = people.filter((p) => p.name.trim());
  const participants = [
    { ref: "me", label: `${userName} (you)` },
    ...activePeople.map((p, i) => ({ ref: `person:${i}`, label: p.name })),
  ];

  function updatePerson(i: number, v: PersonValue) {
    setPeople((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  }
  function addPersonField() {
    setPeople((prev) => [...prev, { name: "", baseCurrency: "USD" }]);
  }
  function removePersonField(i: number) {
    setPeople((prev) => prev.filter((_, idx) => idx !== i));
  }
  function toggleIncluded(ref: string) {
    setIncluded((prev) => ({ ...prev, [ref]: !prev[ref] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (activePeople.length === 0) {
      toast.error("Add at least one other person");
      return;
    }

    let payload: any = {
      description,
      amount: amt,
      currency,
      paidBy,
      splitType,
      people: activePeople.map((p) => ({ name: p.name.trim(), contactId: p.contactId, baseCurrency: p.baseCurrency })),
    };

    if (splitType === "EQUAL") {
      const refs = participants.filter((p) => included[p.ref]).map((p) => p.ref);
      if (refs.length === 0) {
        toast.error("Select at least one person to split with");
        return;
      }
      payload.memberIds = refs;
    } else {
      const splits = participants
        .filter((p) => values[p.ref])
        .map((p) => ({ ref: p.ref, value: parseFloat(values[p.ref]) }));
      if (splits.length === 0) {
        toast.error("Enter at least one split value");
        return;
      }
      payload.splits = splits;
    }

    setLoading(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't add expense");
      return;
    }
    toast.success("Expense added");
    setDescription("");
    setAmount("");
    setValues({});
    setPeople([{ name: "", baseCurrency: "USD" }]);
    setPaidBy("me");
    setIncluded({ me: true, "person:0": true });
    router.refresh();
    onSuccess?.();
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
            placeholder="e.g. Coffee"
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

      <div>
        <label className="block text-sm font-medium text-text">With</label>
        <p className="mb-2 text-xs text-text-faint">
          Type a name — pick an existing person to combine their history, or type a fresh name to add someone new.
        </p>
        <div className="space-y-2">
          {people.map((p, i) => (
            <PersonPicker
              key={i}
              value={p}
              onChange={(v) => updatePerson(i, v)}
              onRemove={people.length > 1 ? () => removePersonField(i) : undefined}
              placeholder={`Person ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addPersonField}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          + Add another person
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-text">Paid by</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          >
            {participants.map((p) => (
              <option key={p.ref} value={p.ref}>
                {p.label}
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
            {splitType === "EXACT" ? "Amount owed per person" : "Percentage owed per person"}
          </label>
          <div className="mt-1 space-y-2">
            {participants.map((p) => (
              <div key={p.ref} className="flex items-center gap-2">
                <span className="w-32 text-sm text-text-muted">{p.label}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values[p.ref] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [p.ref]: e.target.value }))}
                  className="w-28 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                <span className="text-sm text-text-faint">{splitType === "EXACT" ? currency : "%"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}
