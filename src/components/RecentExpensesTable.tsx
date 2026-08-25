"use client";
import { useEffect, useState } from "react";

interface Row {
  id: string;
  description: string;
  date: string;
  amount: number;
  currency: string;
  groupId: string;
  groupName: string;
  isPersonal: boolean;
  paidByName: string;
  yourShare: number;
}

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All time" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "3months", label: "Past 3 months" },
  { value: "6months", label: "Past 6 months" },
  { value: "year", label: "Past year" },
];

export default function RecentExpensesTable() {
  const [range, setRange] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), ...(range ? { range } : {}) });
    fetch(`/api/user/expenses?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows || []);
        setTotal(data.total || 0);
        setPageSize(data.pageSize || 10);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <a
          href={`/api/user/expenses/export${range ? `?range=${range}` : ""}`}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:border-border-strong hover:text-text"
        >
          Download as Excel
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-faint">
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">Group</th>
              <th className="py-2 pr-3 font-medium">Paid by</th>
              <th className="py-2 pr-3 text-right font-medium">Your share</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap py-2 pr-3 text-text-muted">
                  {new Date(r.date).toLocaleDateString()}
                </td>
                <td className="py-2 pr-3 text-text">{r.description}</td>
                <td className="py-2 pr-3 text-text-muted">{r.groupName}</td>
                <td className="py-2 pr-3 text-text-muted">{r.paidByName}</td>
                <td className="py-2 pr-3 text-right text-text-muted">
                  {r.yourShare.toFixed(2)} {r.currency}
                </td>
                <td className="py-2 text-right font-medium text-text">
                  {r.amount.toFixed(2)} {r.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">No expenses in this range.</p>
        )}
        {loading && <p className="py-6 text-center text-sm text-text-faint">Loading…</p>}
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-text-faint">
            Page {page} of {totalPages} · {total} {total === 1 ? "expense" : "expenses"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1 text-text-muted hover:border-border-strong hover:text-text disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1 text-text-muted hover:border-border-strong hover:text-text disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
