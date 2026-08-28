import type { ExpenseHistoryEntry } from "@/components/expenses/ExpenseTabsForm";

export default function HistoryTab({ historyEntries }: { historyEntries: ExpenseHistoryEntry[] }) {
  if (historyEntries.length === 0) {
    return <p className="text-sm text-text-faint">No changes recorded yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {historyEntries.map((h, i) => (
        <li key={i} className="border-b border-border pb-2 text-sm last:border-0">
          <div className="text-text">{h.summary}</div>
          <div className="text-xs text-text-faint">
            {h.changedBy} · {new Date(h.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
