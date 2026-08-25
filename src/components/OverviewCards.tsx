"use client";
import { useEffect, useState } from "react";

interface Overview {
  baseCurrency: string;
  netBalance: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  groupCount: number;
  skippedCurrencies: string[];
}

export default function OverviewCards() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/user/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface-secondary" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Net balance",
      value: data.netBalance,
      tone: data.netBalance >= 0 ? "text-success-text" : "text-error",
    },
    { label: "Owed to you", value: data.totalOwedToYou, tone: "text-success-text" },
    { label: "You owe", value: data.totalYouOwe, tone: "text-error" },
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="text-sm text-text-muted">{c.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${c.tone}`}>
              {Math.abs(c.value).toFixed(2)} <span className="text-sm font-normal">{data.baseCurrency}</span>
            </div>
          </div>
        ))}
      </div>
      {data.skippedCurrencies.length > 0 && (
        <p className="mt-2 text-xs text-text-faint">
          Couldn't convert some balances in {data.skippedCurrencies.join(", ")} — no exchange rate on file for
          those yet.
        </p>
      )}
    </div>
  );
}
