import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NewGroupForm from "@/components/NewGroupForm";

export default async function GroupsPage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session.userId } } },
    include: { members: true, _count: { select: { expenses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-text">Your groups</h1>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
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
            No groups yet — create one below to get started.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-text">Start a new group</h2>
        <NewGroupForm />
      </div>
    </div>
  );
}
