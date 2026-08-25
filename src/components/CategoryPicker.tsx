"use client";
import { useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;
}

const ICONS: Record<string, () => JSX.Element> = {
  food: () => (
    <svg {...iconProps()}>
      <path d="M6 2v7a2 2 0 002 2 2 2 0 002-2V2M8 11v11M18 2c-2 1-3 3-3 6s1 3 3 3v10" />
    </svg>
  ),
  movie: () => (
    <svg {...iconProps()}>
      <rect x="2" y="5" width="20" height="15" rx="2" />
      <path d="M7 5l2 4M12 5l2 4M17 5l2 4" />
    </svg>
  ),
  transport: () => (
    <svg {...iconProps()}>
      <rect x="3" y="10" width="18" height="8" rx="2" />
      <path d="M5 10l1.5-5h11L19 10" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="16.5" cy="18.5" r="1.5" />
    </svg>
  ),
  shopping: () => (
    <svg {...iconProps()}>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </svg>
  ),
  home: () => (
    <svg {...iconProps()}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  travel: () => (
    <svg {...iconProps()}>
      <path d="M2 16l20-7-7 20-3-8-8-3-2-2z" />
    </svg>
  ),
  utilities: () => (
    <svg {...iconProps()}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  ),
  other: () => (
    <svg {...iconProps()}>
      <path d="M20.6 12.3l-8.9 8.9a2 2 0 01-2.8 0l-6.1-6.1a2 2 0 010-2.8l8.9-8.9A2 2 0 0113 3l7 .1a2 2 0 011.9 1.9l.1 7a2 2 0 01-.6 1.4z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  ),
};

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

  function pick(key: string) {
    if (key === "other") {
      setCustomOpen(true);
      onChange(customValue);
    } else {
      setCustomOpen(false);
      onChange(key);
    }
  }

  const selectedTile = isKnown ? value : customOpen ? "other" : "";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {EXPENSE_CATEGORIES.map((c) => {
          const Icon = ICONS[c.key];
          const active = selectedTile === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => pick(c.key)}
              className={`flex w-16 flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs ${
                active
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border text-text-muted hover:border-border-strong hover:text-text"
              }`}
            >
              <Icon />
              {c.label}
            </button>
          );
        })}
      </div>
      {customOpen && (
        <input
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Custom category"
          className="mt-2 w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
      )}
    </div>
  );
}
