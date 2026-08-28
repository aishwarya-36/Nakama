"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import SearchToggle from "@/components/ui/SearchToggle";
import NewGroupButton from "@/components/groups/NewGroupButton";
import { useInfiniteScrollSentinel } from "@/lib/useInfiniteScrollSentinel";

interface Group {
  id: string;
  name: string;
  members: { id: string }[];
  _count: { expenses: number };
}

export default function GroupsList({
  initialGroups,
  initialTotal,
}: {
  initialGroups: Group[];
  initialTotal: number;
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (query: string, targetPage: number, replace: boolean) => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(targetPage), ...(query ? { q: query } : {}) });
    const res = await fetch(`/api/groups?${qs}`);
    const data = await res.json();
    setLoading(false);
    setGroups((prev) => (replace ? data.groups : [...prev, ...data.groups]));
    setTotal(data.total ?? 0);
  }, []);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setPage(1);
    load(q, 1, true);
  }, [q, load]);

  function loadMore() {
    if (loading || groups.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(q, nextPage, false);
  }

  const sentinelRef = useInfiniteScrollSentinel(loadMore, !loading && groups.length < total);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Your groups</h1>
        <div className="flex items-center gap-2">
          <SearchToggle onSearch={setQ} placeholder="Search groups…" />
          <NewGroupButton />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm transition hover:border-primary hover:shadow"
          >
            <div className="font-medium text-text">{g.name}</div>
            <div className="mt-1 text-sm text-text-muted">
              {g.members.length} {g.members.length === 1 ? "member" : "members"} ·{" "}
              {g._count.expenses} {g._count.expenses === 1 ? "expense" : "expenses"}
            </div>
          </Link>
        ))}
      </div>

      {groups.length === 0 && !loading && (
        <p className="text-sm text-text-muted">
          {q ? `No groups match "${q}".` : "No groups yet — create one to get started."}
        </p>
      )}

      {loading && <p className="py-3 text-center text-sm text-text-faint">Loading…</p>}
      {groups.length < total && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
