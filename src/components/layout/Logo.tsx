"use client";
import { useId } from "react";

// Wordmark filled with a tiled pattern of tiny person silhouettes.
export default function Logo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const patternId = `nakama-person-pattern-${useId()}`;

  return (
    <svg
      viewBox={compact ? "0 0 32 32" : "0 0 168 40"}
      className={`text-primary ${compact ? "h-8 w-8" : "h-9 w-auto"} ${className}`}
      role="img"
      aria-label="Nakama"
    >
      <defs>
        <pattern id={patternId} width="12" height="15" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="3.4" r="2.3" fill="currentColor" />
          <path d="M1.3 15c0-4.9 1.9-7.3 4.7-7.3s4.7 2.4 4.7 7.3z" fill="currentColor" />
        </pattern>
      </defs>
      <text
        x="0"
        y={compact ? "24" : "32"}
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize={compact ? "30" : "34"}
        letterSpacing="1"
        fill={`url(#${patternId})`}
      >
        {compact ? "N" : "NAKAMA"}
      </text>
    </svg>
  );
}
