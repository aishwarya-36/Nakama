"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onExpensesChanged, onSettlementChanged } from "@/lib/events";

interface Item {
  id: string;
  type: "group_created" | "expense" | "settlement";
  summary: string;
  detail?: string;
  groupName: string | null;
  timestamp: string;
  href: string;
}

function TypeIcon({ type }: { type: Item["type"] }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  if (type === "group_created") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        <circle cx="17" cy="8" r="2.5" />
        <path d="M16.5 14.2c2.6.5 4.5 2.6 4.5 5.8" />
      </svg>
    );
  }
  if (type === "settlement") {
    return (
      <svg {...common}>
        <path d="M4 12h16" />
        <path d="M14 6l6 6-6 6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15l3-3 2.5 2.5L17 10" />
    </svg>
  );
}

const PAGE_SIZE = 10;

export default function ActivityList() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    const res = await fetch(`/api/user/activity?page=${targetPage}`);
    const data = await res.json();
    setLoading(false);
    setItems(data.items || []);
    setTotal(data.total ?? 0);
  }, []);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onChanged() {
      setPage(1);
      load(1);
    }
    const offExpenses = onExpensesChanged(onChanged);
    const offSettlement = onSettlementChanged(onChanged);
    return () => {
      offExpenses();
      offSettlement();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPage(p: number) {
    setPage(p);
    load(p);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (items.length === 0 && !loading) {
    return <p className="text-sm text-text-muted">No activity yet — add an expense or create a group to get started.</p>;
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="h-[60px] animate-pulse py-3">
                <div className="h-full rounded-md bg-surface-secondary" />
              </div>
            ))
          : items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="-mx-2 flex items-start gap-3 rounded-md px-2 py-3 hover:bg-surface-secondary"
              >
                <div className="mt-0.5 text-text-faint">
                  <TypeIcon type={item.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text">{item.summary}</div>
                  {item.detail && <div className="text-xs text-text-faint">{item.detail}</div>}
                  <div className="text-xs text-text-faint">
                    {item.groupName && `${item.groupName} · `}
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-border-strong hover:text-text disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-text-faint">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-border-strong hover:text-text disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
