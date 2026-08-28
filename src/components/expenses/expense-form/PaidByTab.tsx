import type { Participant } from "@/components/expenses/ExpenseTabsForm";

export default function PaidByTab({
  participants,
  payerRefs,
  setPayerRefs,
  payerValues,
  setPayerValues,
  currency,
  payerRemaining,
  togglePayer,
  addPayerRow,
}: {
  participants: Participant[];
  payerRefs: string[];
  setPayerRefs: React.Dispatch<React.SetStateAction<string[]>>;
  payerValues: Record<string, string>;
  setPayerValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currency: string;
  payerRemaining: number;
  togglePayer: (ref: string) => void;
  addPayerRow: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-text-faint">Add each person who paid, and how much — it must add up to the total.</p>
      {payerRefs.map((ref) => {
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
  );
}
