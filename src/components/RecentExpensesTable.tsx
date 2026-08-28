"use client";
import { useCallback, useEffect, useState } from "react";
import SearchToggle from "./SearchToggle";
import ExpenseEditModal from "./ExpenseEditModal";
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
  yourPaid: number;
  yourNet: number;
}

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All time" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "3months", label: "Past 3 months" },
  { value: "6months", label: "Past 6 months" },
  { value: "year", label: "Past year" },
];

const SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All spending" },
  { value: "mine", label: "My spends" },
  { value: "group", label: "Group spends" },
];

const OWE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "owe", label: "I owe" },
  { value: "owed", label: "I am owed" },
];

export default function RecentExpensesTable({
  fixedScope,
  showOweFilter = false,
}: {
  fixedScope?: "mine" | "group";
  showOweFilter?: boolean;
}) {
  const [range, setRange] = useState("");
  const [scope, setScope] = useState(fixedScope || "");
  const [owe, setOwe] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ groupId: string; expenseId: string } | null>(null);

  const load = useCallback(
    async (r: string, s: string, o: string, query: string, targetPage: number, replace: boolean) => {
      setLoading(true);
      const qs = new URLSearchParams({
        page: String(targetPage),
        ...(r ? { range: r } : {}),
        ...(s ? { scope: s } : {}),
        ...(o ? { owe: o } : {}),
        ...(query ? { q: query } : {}),
      });
      const res = await fetch(`/api/user/expenses?${qs}`);
      const data = await res.json();
      setLoading(false);
      setRows((prev) => (replace ? data.rows || [] : [...prev, ...(data.rows || [])]));
      setTotal(data.total || 0);
    },
    []
  );

  useEffect(() => {
    setPage(1);
    load(range, scope, owe, q, 1, true);
  }, [range, scope, owe, q, load]);

  function loadMore() {
    if (loading || rows.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(range, scope, owe, q, nextPage, false);
  }

  const sentinelRef = useInfiniteScrollSentinel(loadMore, !loading && rows.length < total);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!fixedScope && (
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {showOweFilter && (
            <select
              value={owe}
              onChange={(e) => setOwe(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
            >
              {OWE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
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
          href={`/api/user/expenses/export?${new URLSearchParams({
            ...(range ? { range } : {}),
            ...(scope ? { scope } : {}),
            ...(owe ? { owe } : {}),
          })}`}
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
              <th className="py-2 pr-3 text-right font-medium">Amount</th>
              {showOweFilter && <th className="py-2 text-right font-medium">Status</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setEditing({ groupId: r.groupId, expenseId: r.id })}
                className="cursor-pointer hover:bg-surface-secondary"
              >
                <td className="whitespace-nowrap py-2 pr-3 text-text-muted">
                  {new Date(r.date).toLocaleDateString()}
                </td>
                <td className="py-2 pr-3 text-text">{r.description}</td>
                <td className="py-2 pr-3 text-text-muted">{r.groupName}</td>
                <td className="py-2 pr-3 text-text-muted">{r.paidByName}</td>
                <td className="py-2 pr-3 text-right text-text-muted">
                  {r.yourShare.toFixed(2)} {r.currency}
                </td>
                <td className="py-2 pr-3 text-right font-medium text-text">
                  {r.amount.toFixed(2)} {r.currency}
                </td>
                {showOweFilter && (
                  <td className="py-2 text-right">
                    {Math.abs(r.yourNet) < 0.005 ? (
                      <span className="text-text-faint">Settled</span>
                    ) : r.yourNet > 0 ? (
                      <span className="text-success-text">
                        Owed {r.yourNet.toFixed(2)} {r.currency}
                      </span>
                    ) : (
                      <span className="text-error">
                        You owe {Math.abs(r.yourNet).toFixed(2)} {r.currency}
                      </span>
                    )}
                  </td>
                )}
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

      <ExpenseEditModal
        groupId={editing?.groupId || ""}
        expenseId={editing?.expenseId || ""}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setPage(1);
          load(range, scope, owe, q, 1, true);
        }}
      />
    </div>
  );
}
