"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CurrencySelect from "./CurrencySelect";
import CategoryPicker from "./CategoryPicker";
import { useToast } from "./ToastProvider";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// A personal spend with no one else on it — backed by the same solo
// personal group every time (found-or-created, contactIds: []), so it
// skips the With / Paid by / Split tabs entirely: it's always paid by
// and split 100% to "me".
export default function AddMySpendForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Enter a description");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        amount: amt,
        currency,
        category: category || undefined,
        notes: notes.trim() || undefined,
        date: new Date(date + "T00:00:00.000Z").toISOString(),
        splitType: "EQUAL",
        people: [],
        payers: [{ ref: "me", value: amt }],
        memberIds: ["me"],
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't add expense");
      return;
    }

    setDescription("");
    setAmount("");
    setCategory("");
    setNotes("");
    setDate(todayISODate());
    toast.success("Expense added");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Coffee"
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
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
            className="w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2.5 text-lg tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
          />
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
      </div>

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

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Adding…" : "Add spend"}
        </button>
      </div>
    </form>
  );
}
