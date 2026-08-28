"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EXPENSE_CATEGORIES, CATEGORY_COLOR_VAR } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/components/expenses/CategoryPicker";

interface MonthlyPoint {
  month: string; // "YYYY-MM"
  total: number;
  byCategory: Record<string, number>;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md"
      style={{ color: "rgb(var(--color-text))" }}
    >
      <div className="mb-1.5 font-medium text-text-muted">{label}</div>
      <div className="space-y-1">
        {EXPENSE_CATEGORIES.map((c) => {
          const entry = payload.find((p: any) => p.dataKey === c.key);
          if (!entry || !entry.value) return null;
          const Icon = CATEGORY_ICONS[c.key];
          return (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center" style={{ color: entry.fill }} title={c.label}>
                <Icon />
                <span className="sr-only">{c.label}</span>
              </span>
              <span className="tabular-nums text-text">
                {Number(entry.value).toFixed(2)} {currency}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MonthlySpendingChart() {
  const [data, setData] = useState<MonthlyPoint[] | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/monthly-spending?months=6")
      .then((r) => r.json())
      .then((d) => {
        setData(d.months);
        setCurrency(d.baseCurrency);
      });
  }, []);

  if (!data) {
    return <div className="h-56 animate-pulse rounded-md bg-surface-secondary" />;
  }

  const allZero = data.every((d) => d.total === 0);
  if (allZero) {
    return <p className="py-10 text-center text-sm text-text-muted">No expenses in the last 6 months yet.</p>;
  }

  const chartData = data.map((d) => ({ ...d, label: formatMonthLabel(d.month), ...d.byCategory }));

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="rgb(var(--color-text-muted))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="rgb(var(--color-text-muted))" fontSize={12} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "rgb(var(--color-surface-secondary))" }} />
            {EXPENSE_CATEGORIES.map((c, i) => (
              <Bar
                key={c.key}
                dataKey={c.key}
                name={c.label}
                stackId="spend"
                fill={`rgb(var(${CATEGORY_COLOR_VAR[c.key]}))`}
                fillOpacity={hovered && hovered !== c.key ? 0.25 : 1}
                radius={i === EXPENSE_CATEGORIES.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onMouseEnter={() => setHovered(c.key)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              hovered && hovered !== c.key ? "opacity-35" : "opacity-100"
            }`}
          >
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: `rgb(var(${CATEGORY_COLOR_VAR[c.key]}))` }}
            />
            <span className="text-text-muted">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
