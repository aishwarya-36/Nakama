"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import SettleUpForm from "./SettleUpForm";
import AddPaymentForm from "./AddPaymentForm";
import { onSettlementChanged } from "@/lib/events";
import type { Member } from "@/lib/types";

interface Data {
  owed: number;
  owe: number;
  byCurrency: Record<string, { owedToYou: number; youOwe: number }>;
  skippedCurrencies: string[];
  baseCurrency: string;
}

const BREAKDOWN_LIMIT = 2;

export default function GroupBalanceCards({
  groupId,
  members,
  defaultCurrency,
}: {
  groupId: string;
  members: Member[];
  defaultCurrency: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [expanded, setExpanded] = useState<{ label: string; breakdown: { currency: string; value: number }[] } | null>(
    null
  );
  const [settleOpen, setSettleOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  function load() {
    fetch(`/api/groups/${groupId}/my-balance`)
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    load();
    return onSettlementChanged(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  if (!data) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface-secondary" />
        ))}
      </div>
    );
  }

  const currencyEntries = Object.entries(data.byCurrency);
  const cards = [
    {
      label: "You are owed",
      value: data.owed,
      tone: "text-success-text",
      breakdown: currencyEntries
        .map(([currency, b]) => ({ currency, value: b.owedToYou }))
        .filter((e) => e.value > 0.005),
    },
    {
      label: "You owe",
      value: data.owe,
      tone: "text-error",
      breakdown: currencyEntries.map(([currency, b]) => ({ currency, value: b.youOwe })).filter((e) => e.value > 0.005),
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="text-sm text-text-muted">{c.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${c.tone}`}>
              {c.value.toFixed(2)} <span className="text-sm font-normal">{data.baseCurrency}</span>
            </div>
            {c.breakdown.length > 0 &&
              !(c.breakdown.length === 1 && c.breakdown[0].currency === data.baseCurrency) && (
                <div className="mt-1 space-y-0.5 text-xs text-text-faint">
                  {c.breakdown.slice(0, BREAKDOWN_LIMIT).map((e) => (
                    <div key={e.currency}>
                      {e.value.toFixed(2)} {e.currency}
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

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setSettleOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-border-strong"
        >
          Settle up
        </button>
        <button
          onClick={() => setPayOpen(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-border-strong"
        >
          + Add payment
        </button>
      </div>

      <Modal open={expanded !== null} onClose={() => setExpanded(null)} title={expanded?.label || ""}>
        <div className="space-y-2">
          {expanded?.breakdown.map((e) => (
            <div key={e.currency} className="flex items-center justify-between text-sm text-text">
              <span className="text-text-muted">{e.currency}</span>
              <span className="font-medium">{e.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={settleOpen} onClose={() => setSettleOpen(false)} title="Settle up">
        <SettleUpForm groupId={groupId} />
      </Modal>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Add payment">
        <AddPaymentForm groupId={groupId} members={members} defaultCurrency={defaultCurrency} onDone={() => setPayOpen(false)} />
      </Modal>
    </div>
  );
}
