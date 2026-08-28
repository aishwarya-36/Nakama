"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CurrencySelect from "@/components/ui/CurrencySelect";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import AttachmentPicker from "@/components/expenses/AttachmentPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { apiPost } from "@/lib/api";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddMySpendForm({
  onSuccess,
  defaultCurrency = "USD",
}: {
  onSuccess?: () => void;
  defaultCurrency?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [attachment, setAttachment] = useState<File | null>(null);
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
    const result = await apiPost("/api/expenses", {
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
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't add expense");
      return;
    }

    setDescription("");
    setAmount("");
    setCategory("");
    setNotes("");
    setDate(todayISODate());
    setAttachment(null);
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
            className="h-12 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-lg tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
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
          <label className="block text-sm font-medium text-text">Category</label>
          <div className="mt-1">
            <CategoryPicker value={category} onChange={setCategory} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering"
          rows={4}
          className="mt-1 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <AttachmentPicker file={attachment} onChange={setAttachment} />

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
