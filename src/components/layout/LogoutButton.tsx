"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        onClick={onClick}
        title="Log out"
        aria-label="Log out"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary hover:text-text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-secondary hover:text-text"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      Log out
    </button>
  );
}
