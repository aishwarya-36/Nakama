"use client";
import { useEffect, useRef, useState } from "react";
import { ALL_CURRENCIES } from "@/lib/currencies";

export interface PersonValue {
  name: string;
  contactId?: string;
  baseCurrency: string;
}

interface Contact {
  id: string;
  name: string;
  baseCurrency: string;
  groupNames: string[];
}

export default function PersonPicker({
  value,
  onChange,
  onRemove,
  placeholder,
  defaultCurrency = "USD",
}: {
  value: PersonValue;
  onChange: (v: PersonValue) => void;
  onRemove?: () => void;
  placeholder?: string;
  defaultCurrency?: string;
}) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (value.contactId) return; // already picked, no need to search
    const q = value.name.trim();
    const t = setTimeout(() => {
      fetch(`/api/contacts?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.contacts || []))
        .catch(() => setSuggestions([]));
    }, 150);
    return () => clearTimeout(t);
  }, [value.name, value.contactId]);

  function selectContact(c: Contact) {
    onChange({ name: c.name, contactId: c.id, baseCurrency: c.baseCurrency });
    setOpen(false);
  }

  function onNameChange(name: string) {
    // Typing anything invalidates a previous contact pick — it's a fresh name now.
    onChange({ name, contactId: undefined, baseCurrency: value.baseCurrency });
    setOpen(true);
  }

  return (
    <div className="flex gap-2">
      <div ref={boxRef} className="relative w-full max-w-xs">
        <input
          value={value.name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Name"}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
        />
        {value.contactId && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary">linked</span>
        )}
        {open && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-md">
            {suggestions.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => selectContact(c)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface-secondary"
              >
                <span className="text-text">{c.name}</span>
                <span className="text-xs text-text-faint">
                  {c.groupNames.length > 0 ? `In: ${c.groupNames.join(", ")}` : "Not in any group yet"} ·{" "}
                  {c.baseCurrency}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <select
        value={value.baseCurrency}
        onChange={(e) => onChange({ ...value, baseCurrency: e.target.value })}
        title="This person's base currency"
        className="w-24 rounded-md border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
      >
        {ALL_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
      {onRemove && (
        <button type="button" onClick={onRemove} className="px-1 text-sm text-text-faint hover:text-error">
          ✕
        </button>
      )}
    </div>
  );
}
