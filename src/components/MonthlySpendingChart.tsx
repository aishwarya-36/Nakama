"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface MonthlyPoint {
  month: string; // "YYYY-MM"
  total: number;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

export default function MonthlySpendingChart() {
  const [data, setData] = useState<MonthlyPoint[] | null>(null);
  const [currency, setCurrency] = useState("USD");

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

  const chartData = data.map((d) => ({ ...d, label: formatMonthLabel(d.month) }));

  return (
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
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)} ${currency}`, "Your share"]}
            contentStyle={{
              background: "rgb(var(--color-surface))",
              border: "1px solid rgb(var(--color-border))",
              borderRadius: 8,
              fontSize: 13,
              color: "rgb(var(--color-text))",
            }}
          />
          <Bar dataKey="total" fill="rgb(var(--color-primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
