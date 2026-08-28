"use client";
import { useEffect, useState } from "react";

interface Debt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
}

export default function GroupSummaryCard({ groupId }: { groupId: string }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch(`/api/groups/${groupId}/balances`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setDebts(data.debts || []);
        })
        .finally(() => !cancelled && setLoading(false));
    }
    load();
    window.addEventListener("nakama:settlement-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("nakama:settlement-changed", load);
    };
  }, [groupId]);

  return (
    <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-medium text-text">Summary</h2>
      {loading ? (
        <p className="text-sm text-text-faint">Loading…</p>
      ) : debts.length === 0 ? (
        <p className="text-sm text-text-faint">Everyone's settled up.</p>
      ) : (
        <ul className="space-y-1 text-sm text-text-muted">
          {debts.map((d, i) => (
            <li key={i}>
              <span className="font-medium text-text">{d.fromName}</span> owes{" "}
              <span className="font-medium text-text">{d.toName}</span> {d.amount.toFixed(2)} {d.currency}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
