"use client";
import { useEffect, useState } from "react";

type NativeBalance = { memberId: string; displayName: string; byCurrency: Record<string, number> };
type ConvertedBalance = { memberId: string; displayName: string; total: number; skippedCurrencies: string[] };
type Debt = {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
};

export default function BalancesPanel({
  groupId,
  defaultCurrency,
}: {
  groupId: string;
  defaultCurrency: string;
}) {
  // Starts on the viewer's base currency rather than the raw per-expense view —
  // "Original currencies" is still one tap away via the toggle below.
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(defaultCurrency);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([defaultCurrency]);
  const [nativeBalances, setNativeBalances] = useState<NativeBalance[]>([]);
  const [converted, setConverted] = useState<ConvertedBalance[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = displayCurrency
      ? `/api/groups/${groupId}/balances?currency=${displayCurrency}`
      : `/api/groups/${groupId}/balances`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setDebts(data.debts || []);
        if (data.availableCurrencies) setAvailableCurrencies(data.availableCurrencies);
        setNativeBalances(data.native || []);
        if (displayCurrency) {
          setConverted(data.balances || []);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [groupId, displayCurrency]);

  const nativeByMember = new Map(nativeBalances.map((b) => [b.memberId, b.byCurrency]));

  const skippedCurrencies = displayCurrency
    ? Array.from(new Set(converted.flatMap((b) => b.skippedCurrencies)))
    : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Show in:</span>
        {availableCurrencies.map((c) => (
          <button
            key={c}
            onClick={() => setDisplayCurrency(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              displayCurrency === c
                ? "bg-primary text-primary-contrast"
                : "bg-surface-secondary text-text-muted hover:bg-border"
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setDisplayCurrency(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            displayCurrency === null
              ? "bg-primary text-primary-contrast"
              : "bg-surface-secondary text-text-muted hover:bg-border"
          }`}
        >
          Original currencies
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-text-faint">Loading…</p>
      ) : (
        <>
          <div className="mb-4 space-y-2.5">
            {displayCurrency
              ? converted.map((b) => (
                  <BalanceLine
                    key={b.memberId}
                    name={b.displayName}
                    amount={b.total}
                    currency={displayCurrency}
                    breakdown={nativeByMember.get(b.memberId)}
                  />
                ))
              : nativeBalances.map((b) =>
                  Object.entries(b.byCurrency).length === 0 ? (
                    <BalanceLine key={b.memberId} name={b.displayName} amount={0} currency="" />
                  ) : (
                    Object.entries(b.byCurrency).map(([currency, amount]) => (
                      <BalanceLine key={b.memberId + currency} name={b.displayName} amount={amount} currency={currency} />
                    ))
                  )
                )}
          </div>

          {skippedCurrencies.length > 0 && (
            <p className="mb-3 text-xs text-text-faint">
              Couldn't convert amounts in {skippedCurrencies.join(", ")} — no exchange rate on file yet.
            </p>
          )}

          {debts.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-medium text-text">Suggested settlements</h3>
              <ul className="space-y-1 text-sm text-text-muted">
                {debts.map((d, i) => (
                  <li key={i}>
                    <span className="font-medium">{d.fromName}</span> owes{" "}
                    <span className="font-medium">{d.toName}</span> {d.amount.toFixed(2)} {d.currency}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {debts.length === 0 && <p className="text-sm text-text-faint">Everyone's settled up.</p>}
        </>
      )}
    </div>
  );
}

function BalanceLine({
  name,
  amount,
  currency,
  breakdown,
}: {
  name: string;
  amount: number;
  currency: string;
  breakdown?: Record<string, number>;
}) {
  const rounded = Math.round(amount * 100) / 100;
  const color = rounded > 0.004 ? "text-success-text" : rounded < -0.004 ? "text-error" : "text-text-faint";
  const label = rounded > 0.004 ? "is owed" : rounded < -0.004 ? "owes" : "is settled up";
  const breakdownEntries = Object.entries(breakdown || {}).filter(([, amt]) => Math.abs(amt) > 0.005);

  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-text">{name}</span>
      <div className="text-right">
        <span className={color}>
          {label} {rounded !== 0 && `${Math.abs(rounded).toFixed(2)} ${currency}`}
        </span>
        {breakdownEntries.length > 0 && (
          <ul className="mt-0.5 space-y-0.5 text-xs text-text-faint">
            {breakdownEntries.map(([c, amt]) => (
              <li key={c}>
                {amt > 0 ? "owed" : "owes"} {Math.abs(amt).toFixed(2)} {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
