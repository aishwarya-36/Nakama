import CurrencySelect from "@/components/ui/CurrencySelect";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import AttachmentPicker from "@/components/expenses/AttachmentPicker";

export default function DetailsTab({
  description,
  setDescription,
  amount,
  setAmount,
  currency,
  setCurrency,
  detailsExtra,
  date,
  setDate,
  category,
  setCategory,
  notes,
  setNotes,
  attachment,
  setAttachment,
}: {
  description: string;
  setDescription: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  detailsExtra?: React.ReactNode;
  date: string;
  setDate: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  attachment: File | null;
  setAttachment: (f: File | null) => void;
}) {
  return (
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
    </div>
  );
}
