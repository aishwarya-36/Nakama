"use client";
import { useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const knownKeys = EXPENSE_CATEGORIES.map((c) => c.key as string).filter((k) => k !== "other");
  const isKnown = knownKeys.includes(value);
  const [customOpen, setCustomOpen] = useState(!isKnown && value !== "");
  const [customValue, setCustomValue] = useState(!isKnown ? value : "");

  function onSelect(key: string) {
    if (key === "other") {
      setCustomOpen(true);
      onChange(customValue);
    } else {
      setCustomOpen(false);
      onChange(key);
    }
  }

  const selected = isKnown ? value : customOpen ? "other" : "";

  return (
    <div>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
      >
        <option value="" disabled>
          Select a category
        </option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      {customOpen && (
        <input
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Custom category"
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      )}
    </div>
  );
}
