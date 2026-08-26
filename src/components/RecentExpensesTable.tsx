"use client";
import { useCallback, useEffect, useState } from "react";
import SearchToggle from "./SearchToggle";
import { useInfiniteScrollSentinel } from "@/lib/useInfiniteScrollSentinel";

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
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: string, query: string, targetPage: number, replace: boolean) => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(targetPage),
      ...(r ? { range: r } : {}),
      ...(query ? { q: query } : {}),
    });
    const res = await fetch(`/api/user/expenses?${qs}`);
    const data = await res.json();
    setLoading(false);
    setRows((prev) => (replace ? data.rows || [] : [...prev, ...(data.rows || [])]));
    setTotal(data.total || 0);
  }, []);

  useEffect(() => {
    setPage(1);
    load(range, q, 1, true);
  }, [range, q, load]);

  function loadMore() {
    if (loading || rows.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(range, q, nextPage, false);
  }

  const sentinelRef = useInfiniteScrollSentinel(loadMore, !loading && rows.length < total);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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
          <SearchToggle onSearch={setQ} placeholder="Search expenses…" />
        </div>
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
          <p className="py-6 text-center text-sm text-text-muted">
            {q ? `No expenses match "${q}".` : "No expenses in this range."}
          </p>
        )}
        {loading && <p className="py-6 text-center text-sm text-text-faint">Loading…</p>}
      </div>

      {total > 0 && (
        <div className="mt-3 text-sm text-text-faint">
          {rows.length} of {total} {total === 1 ? "expense" : "expenses"}
        </div>
      )}
      {rows.length < total && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
