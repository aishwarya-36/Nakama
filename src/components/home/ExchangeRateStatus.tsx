"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { apiPost } from "@/lib/api";

export default function ExchangeRateStatus() {
  const toast = useToast();
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/exchange-rates")
      .then((r) => r.json())
      .then((data) => setFetchedAt(data.fetchedAt))
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    const result = await apiPost<{ fetchedAt: string }>("/api/exchange-rates");
    setRefreshing(false);
    if (!result.ok) {
      toast.error(result.error || "Couldn't refresh exchange rates");
      return;
    }
    setFetchedAt(result.data.fetchedAt);
    toast.success("Exchange rates refreshed");
  }

  return (
    <div className="mb-4 flex items-center gap-1.5 text-sm text-text-muted">
      <span>
        {loading
          ? "Loading exchange rates…"
          : fetchedAt
            ? `Exchange rates as of ${new Date(fetchedAt).toLocaleDateString()}`
            : "Exchange rates haven't been fetched yet."}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        aria-label="Refresh exchange rates"
        title="Refresh exchange rates"
        className="rounded-md p-1 text-text-faint hover:bg-surface-secondary hover:text-text disabled:opacity-60"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={refreshing ? "animate-spin" : ""}
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
    </div>
  );
}
