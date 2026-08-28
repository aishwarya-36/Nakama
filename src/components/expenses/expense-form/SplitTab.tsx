import type { Participant, SplitType } from "@/components/expenses/ExpenseTabsForm";

export default function SplitTab({
  participants,
  splitType,
  setSplitType,
  included,
  toggleIncluded,
  splitValues,
  setSplitValues,
  currency,
}: {
  participants: Participant[];
  splitType: SplitType;
  setSplitType: (t: SplitType) => void;
  included: Record<string, boolean>;
  toggleIncluded: (ref: string) => void;
  splitValues: Record<string, string>;
  setSplitValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currency: string;
}) {
  return (
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
  );
}
