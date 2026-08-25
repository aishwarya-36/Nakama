import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddExpenseForm from "@/components/AddExpenseForm";
import AddMemberForm from "@/components/AddMemberForm";
import BalancesPanel from "@/components/BalancesPanel";

export default async function GroupPage({ params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      expenses: {
        include: { splits: true, paidBy: true },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!group) notFound();
  const isMember = group.members.some((m) => m.userId === session.userId);
  if (!isMember) redirect("/groups");

  const me = await prisma.user.findUnique({ where: { id: session.userId } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/groups" className="text-sm text-text-muted hover:text-primary">
        ← All groups
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold text-text">{group.name}</h1>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-text">Members</h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {group.members.map((m) => (
            <span
              key={m.id}
              className="rounded-full bg-surface-secondary px-3 py-1 text-sm text-text"
            >
              {m.displayName}
              {!m.userId && <span className="ml-1 text-xs text-text-faint">(guest)</span>}
            </span>
          ))}
        </div>
        <AddMemberForm groupId={group.id} />
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Balances</h2>
        <BalancesPanel groupId={group.id} defaultCurrency={me?.baseCurrency || "USD"} />
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Add an expense</h2>
        <AddExpenseForm groupId={group.id} members={group.members} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Expenses</h2>
        <div className="divide-y divide-border">
          {group.expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-text">{exp.description}</div>
                <div className="text-sm text-text-muted">
                  Paid by {exp.paidBy.displayName} ·{" "}
                  {new Date(exp.date).toLocaleDateString()}
                </div>
              </div>
              <div className="font-medium text-text">
                {Number(exp.amount).toFixed(2)} {exp.currency}
              </div>
            </div>
          ))}
          {group.expenses.length === 0 && (
            <p className="py-3 text-sm text-text-muted">No expenses yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
