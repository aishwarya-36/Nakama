"use client";
import { useEffect, useRef, useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

function iconProps() {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;
}

function FoodIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M5 2v6M7.5 2v6M10 2v6" />
      <path d="M7.5 8v14" />
      <path d="M17 2c-2 0-4 2-4 5s2 5 4 5" />
      <path d="M17 2v19" />
    </svg>
  );
}

function MovieIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 8l2-4h4l-2 4M9 8l2-4h4l-2 4M15 8l2-4h3l-2 4" />
      <rect x="3" y="8" width="18" height="13" rx="1" />
    </svg>
  );
}

function TransportIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 13l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5" />
      <rect x="2" y="13" width="20" height="5" rx="1.5" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  );
}

function ShoppingIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </svg>
  );
}

function HomeCategoryIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

function TravelIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function UtilitiesIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function OtherIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export const CATEGORY_ICONS: Record<string, () => JSX.Element> = {
  food: FoodIcon,
  movie: MovieIcon,
  transport: TransportIcon,
  shopping: ShoppingIcon,
  home: HomeCategoryIcon,
  travel: TravelIcon,
  utilities: UtilitiesIcon,
  other: OtherIcon,
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
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onSelect(key: string) {
    setOpen(false);
    if (key === "other") {
      setCustomOpen(true);
      onChange(customValue);
    } else {
      setCustomOpen(false);
      onChange(key);
    }
  }

  const selectedKey = isKnown ? value : customOpen ? "other" : "";
  const selectedMeta = EXPENSE_CATEGORIES.find((c) => c.key === selectedKey);
  const SelectedIcon = selectedMeta ? CATEGORY_ICONS[selectedMeta.key] : null;

  return (
    <div>
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        >
          <span className="flex items-center gap-2">
            {SelectedIcon && <SelectedIcon />}
            {selectedMeta ? selectedMeta.label : <span className="text-text-faint">Select a category</span>}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface py-1 shadow-md">
            {EXPENSE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.key];
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => onSelect(c.key)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-secondary ${
                    c.key === selectedKey ? "text-primary" : "text-text"
                  }`}
                >
                  <Icon />
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
