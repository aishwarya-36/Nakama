"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/groups", label: "Groups", icon: GroupsIcon },
  { href: "/people", label: "People", icon: PersonIcon },
  { href: "/expenses", label: "Expenses", icon: ExpensesIcon },
];
const SETTINGS_ITEM = { href: "/settings", label: "Settings", icon: SettingsIcon };

const STORAGE_KEY = "sidebar:collapsed";
const SMALL_SCREEN_QUERY = "(max-width: 767px)";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const initials = getInitials(userName);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "1");
    } else {
      setCollapsed(window.matchMedia(SMALL_SCREEN_QUERY).matches);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-contrast">
          {userName.charAt(0).toUpperCase()}
        </div>
        {!collapsed && <span className="truncate text-sm font-semibold text-text">Nakama</span>}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-text-faint hover:bg-surface-secondary hover:text-text"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-1 flex-col p-3">
        <div className="space-y-1">{NAV_ITEMS.map((item) => renderNavItem(item, pathname, collapsed))}</div>
        <div className="mt-auto space-y-1 pt-1">{renderNavItem(SETTINGS_ITEM, pathname, collapsed)}</div>
      </nav>

      <div className="border-t border-border p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={userName}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary"
            >
              {initials}
            </div>
            <ThemeToggle />
            <LogoutButton iconOnly />
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between px-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                  {initials}
                </div>
                <span className="truncate text-sm text-text-muted">{userName}</span>
              </div>
              <ThemeToggle />
            </div>
            <LogoutButton />
          </>
        )}
      </div>
    </aside>
  );
}

function renderNavItem(
  item: { href: string; label: string; icon: () => JSX.Element },
  pathname: string,
  collapsed: boolean
) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      key={item.href}
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : ""
      } ${active ? "bg-primary-tint text-primary" : "text-text-muted hover:bg-surface-secondary hover:text-text"}`}
    >
      <Icon />
      {!collapsed && item.label}
    </Link>
  );
}

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

function HomeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M16.5 14.2c2.6.5 4.5 2.6 4.5 5.8" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15l3-3 2.5 2.5L17 10" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
