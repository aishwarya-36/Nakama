import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import ActivityList from "@/components/home/ActivityList";

export default function HistoryPage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-text">History</h1>
      <p className="mb-6 text-sm text-text-muted">
        Every action you've taken — adding expenses, creating groups, and recording settlements — newest first.
      </p>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <ActivityList />
      </div>
    </div>
  );
}
