"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";

interface Person {
  id: string;
  name: string;
  baseCurrency: string;
  groupNames: string[];
  total: number;
  skippedCurrencies: string[];
}

export default function PeopleList({
  initialPeople,
  baseCurrency,
}: {
  initialPeople: Person[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [people, setPeople] = useState(initialPeople);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function remove(id: string, name: string) {
    setRemovingId(id);
    const res = await fetch(`/api/people/${id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't remove person");
      return;
    }
    toast.success(`${name} removed`);
    setPeople((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  if (people.length === 0) {
    return <p className="text-sm text-text-muted">No people yet — add one above.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {people.map((p) => {
        const rounded = Math.round(p.total * 100) / 100;
        const tone = rounded > 0.004 ? "text-success-text" : rounded < -0.004 ? "text-error" : "text-text-faint";
        const label = rounded > 0.004 ? "is owed" : rounded < -0.004 ? "owes" : "settled up";
        return (
          <div key={p.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-text">{p.name}</div>
                <div className="text-xs text-text-faint">
                  {p.groupNames.length > 0 ? `In: ${p.groupNames.join(", ")}` : "Not in any group yet"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${tone}`}>
                  {label}
                  {rounded !== 0 && ` ${Math.abs(rounded).toFixed(2)} ${baseCurrency}`}
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.id, p.name)}
                  disabled={removingId === p.id}
                  title="Remove"
                  aria-label={`Remove ${p.name}`}
                  className="rounded-md p-1.5 text-text-faint hover:bg-error-tint hover:text-error disabled:opacity-60"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
            {p.skippedCurrencies.length > 0 && (
              <p className="mt-1 text-xs text-text-faint">
                Couldn't convert amounts in {p.skippedCurrencies.join(", ")} — no exchange rate on file yet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
