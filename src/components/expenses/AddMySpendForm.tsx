"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CurrencySelect from "@/components/ui/CurrencySelect";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import AttachmentPicker from "@/components/expenses/AttachmentPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { apiPatch, apiPost } from "@/lib/api";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

interface EditingSpend {
  groupId: string;
  expenseId: string;
  selfMemberId: string;
  initial: {
    description: string;
    amount: number;
    currency: string;
    category: string;
    notes: string;
    date: string; // yyyy-mm-dd
  };
}

export default function AddMySpendForm({
  onSuccess,
  defaultCurrency = "USD",
  editing,
}: {
  onSuccess?: () => void;
  defaultCurrency?: string;
  // When set, this is a truly solo personal spend (no one else on the
  // expense) being edited in place, rather than a new one being created.
  editing?: EditingSpend;
}) {
  const router = useRouter();
  const toast = useToast();
  const [description, setDescription] = useState(editing?.initial.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.initial.amount) : "");
  const [currency, setCurrency] = useState(editing?.initial.currency ?? defaultCurrency);
  const [category, setCategory] = useState(editing?.initial.category ?? "");
  const [notes, setNotes] = useState(editing?.initial.notes ?? "");
  const [date, setDate] = useState(editing?.initial.date ?? todayISODate());
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
    const result = editing
      ? await apiPatch(`/api/groups/${editing.groupId}/expenses/${editing.expenseId}`, {
          description: description.trim(),
          amount: amt,
          currency,
          category: category || undefined,
          notes: notes.trim() || undefined,
          date: new Date(date + "T00:00:00.000Z").toISOString(),
          splitType: "EQUAL",
          payers: [{ groupMemberId: editing.selfMemberId, value: amt }],
          memberIds: [editing.selfMemberId],
        })
      : await apiPost("/api/expenses", {
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
      toast.error(result.error || (editing ? "Couldn't save changes" : "Couldn't add expense"));
      return;
    }

    if (!editing) {
      setDescription("");
      setAmount("");
      setCategory("");
      setNotes("");
      setDate(todayISODate());
      setAttachment(null);
    }
    toast.success(editing ? "Expense updated" : "Expense added");
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
          {loading ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add spend"}
        </button>
      </div>
    </form>
  );
}
