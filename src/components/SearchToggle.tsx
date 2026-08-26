"use client";
import { useEffect, useRef, useState } from "react";

export default function SearchToggle({
  onSearch,
  placeholder = "Search…",
}: {
  onSearch: (term: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    if (value) {
      setValue("");
      onSearch("");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        title="Search"
        className="rounded-md p-2 text-text-faint hover:bg-surface-secondary hover:text-text"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch(value.trim());
          if (e.key === "Escape") close();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 sm:w-56"
      />
      <button
        type="button"
        onClick={close}
        aria-label="Close search"
        title="Close search"
        className="rounded-md p-2 text-text-faint hover:bg-surface-secondary hover:text-text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
