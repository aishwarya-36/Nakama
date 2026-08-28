"use client";

export default function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="More info"
        className="rounded-full p-0.5 text-text-faint hover:text-text focus:outline-none focus:ring-1 focus:ring-primary/40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md border border-border bg-surface p-3 text-xs text-text-muted opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {children}
      </span>
    </span>
  );
}
