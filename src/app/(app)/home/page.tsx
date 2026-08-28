import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OverviewCards from "@/components/home/OverviewCards";
import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import RecentExpensesTable from "@/components/expenses/RecentExpensesTable";

export default async function HomePage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { isPersonal: false, members: { some: { userId: user.id } } },
    include: { members: true, _count: { select: { expenses: true } } },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Welcome back, {user.name}</h1>
        <AddExpenseButton userName={user.name} baseCurrency={user.baseCurrency} menu={false} />
      </div>
      <p className="mb-6 text-sm text-text-muted">
        Here's where things stand across all your groups.
      </p>

      <OverviewCards />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium text-text">Recent groups</h2>
        <Link href="/groups" className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
        {groups.length === 0 && (
          <p className="text-sm text-text-muted">
            No groups yet.{" "}
            <Link href="/groups" className="font-medium text-primary hover:underline">
              Create your first one
            </Link>
            .
          </p>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-text">Recent group spending</h2>
        <RecentExpensesTable fixedScope="group" showOweFilter />
      </div>
    </div>
  );
}
