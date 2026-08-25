"use client";
import { useEffect, useRef, useState } from "react";
import { ALL_CURRENCIES } from "@/lib/currencies";

// A native <select> can't show a different closed-state label ("USD") from
// its option list ("USD — US Dollar"), so this is a small custom dropdown.
export default function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-24 items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
      >
        {value}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border border-border bg-surface shadow-md">
          {ALL_CURRENCIES.map((c) => (
            <button
              type="button"
              key={c.code}
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-secondary ${
                c.code === value ? "text-primary" : "text-text"
              }`}
            >
              {c.code} — {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
