"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";

interface Overview {
  baseCurrency: string;
  netBalance: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  thisMonthTotal: number;
  thisMonthGroupSpend: number;
  thisMonthPersonalSpend: number;
  groupCount: number;
  skippedCurrencies: string[];
  byCurrency: Record<string, { owedToYou: number; youOwe: number }>;
}

const BREAKDOWN_LIMIT = 2;

export default function OverviewCards({ variant = "balances" }: { variant?: "balances" | "spending" }) {
  const [data, setData] = useState<Overview | null>(null);
  const [expanded, setExpanded] = useState<{ label: string; breakdown: { currency: string; value: number }[] } | null>(
    null
  );

  useEffect(() => {
    function load() {
      fetch("/api/user/overview")
        .then((r) => r.json())
        .then(setData);
    }
    load();
    window.addEventListener("nakama:expenses-changed", load);
    return () => window.removeEventListener("nakama:expenses-changed", load);
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

  const currencyEntries = Object.entries(data.byCurrency || {});

  const cards =
    variant === "spending"
      ? [
          { label: "This month", value: data.thisMonthTotal, tone: "text-text", breakdown: [] as { currency: string; value: number }[] },
          { label: "Group spend", value: data.thisMonthGroupSpend, tone: "text-text", breakdown: [] },
          { label: "Personal spend", value: data.thisMonthPersonalSpend, tone: "text-text", breakdown: [] },
        ]
      : [
          {
            label: "Net balance",
            value: data.netBalance,
            tone: data.netBalance >= 0 ? "text-success-text" : "text-error",
            breakdown: currencyEntries
              .map(([currency, b]) => ({ currency, value: b.owedToYou - b.youOwe }))
              .filter((e) => Math.abs(e.value) > 0.005),
          },
          {
            label: "Owed to you",
            value: data.totalOwedToYou,
            tone: "text-success-text",
            breakdown: currencyEntries
              .map(([currency, b]) => ({ currency, value: b.owedToYou }))
              .filter((e) => e.value > 0.005),
          },
          {
            label: "You owe",
            value: data.totalYouOwe,
            tone: "text-error",
            breakdown: currencyEntries
              .map(([currency, b]) => ({ currency, value: b.youOwe }))
              .filter((e) => e.value > 0.005),
          },
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
            {c.breakdown.length > 0 &&
              !(c.breakdown.length === 1 && c.breakdown[0].currency === data.baseCurrency) && (
              <div className="mt-1 space-y-0.5 text-xs text-text-faint">
                {c.breakdown.slice(0, BREAKDOWN_LIMIT).map((e) => (
                  <div key={e.currency}>
                    {Math.abs(e.value).toFixed(2)} {e.currency}
                  </div>
                ))}
                {c.breakdown.length > BREAKDOWN_LIMIT && (
                  <button
                    onClick={() => setExpanded({ label: c.label, breakdown: c.breakdown })}
                    className="text-text-faint underline hover:text-text-muted"
                  >
                    +{c.breakdown.length - BREAKDOWN_LIMIT} more
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {data.skippedCurrencies.length > 0 && (
        <p className="mt-2 text-xs text-text-faint">
          Couldn't convert some balances in {data.skippedCurrencies.join(", ")} — no exchange rate on file for
          those yet.
        </p>
      )}

      <Modal open={!!expanded} onClose={() => setExpanded(null)} title={expanded?.label || ""}>
        <div className="space-y-2">
          {expanded?.breakdown.map((e) => (
            <div key={e.currency} className="flex items-center justify-between text-sm text-text">
              <span className="text-text-muted">{e.currency}</span>
              <span className="font-medium">{Math.abs(e.value).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
