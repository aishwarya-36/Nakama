import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddGroupExpenseButton from "@/components/AddGroupExpenseButton";
import AddMemberForm from "@/components/AddMemberForm";
import BalancesPanel from "@/components/BalancesPanel";
import GroupBalanceCards from "@/components/GroupBalanceCards";
import GroupSettingsButton from "@/components/GroupSettingsButton";
import GroupNameEditor from "@/components/GroupNameEditor";
import GroupSummaryCard from "@/components/GroupSummaryCard";
import ExpenseListItem from "@/components/ExpenseListItem";

export default async function GroupPage({ params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      expenses: {
        include: {
          splits: true,
          payments: { include: { groupMember: true } },
          history: { orderBy: { createdAt: "desc" } },
        },
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
      <div className="mb-6 mt-1 flex items-start justify-between gap-3">
        <GroupNameEditor groupId={group.id} name={group.name} />
        <div className="flex items-center gap-2">
          <GroupSettingsButton
            groupId={group.id}
            defaultCurrency={group.defaultCurrency}
            simplifyDebts={group.simplifyDebts}
          />
          <AddGroupExpenseButton groupId={group.id} members={group.members} defaultCurrency={group.defaultCurrency} />
        </div>
      </div>

      <GroupBalanceCards groupId={group.id} members={group.members} defaultCurrency={group.defaultCurrency} />

      <GroupSummaryCard groupId={group.id} />

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

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Expenses</h2>
        <div className="divide-y divide-border">
          {group.expenses.map((exp) => (
            <ExpenseListItem
              key={exp.id}
              groupId={group.id}
              expenseId={exp.id}
              members={group.members}
              description={exp.description}
              paidByLabel={
                exp.payments.length === 1
                  ? exp.payments[0].groupMember.displayName
                  : exp.payments.map((p) => p.groupMember.displayName).join(", ")
              }
              dateLabel={new Date(exp.date).toLocaleDateString()}
              category={exp.category}
              amount={Number(exp.amount)}
              currency={exp.currency}
              initial={{
                description: exp.description,
                amount: Number(exp.amount),
                currency: exp.currency,
                category: exp.category || "",
                notes: exp.notes || "",
                date: exp.date.toISOString().slice(0, 10),
                // Stored splits are always resolved dollar amounts regardless of the
                // original split type (equal/percentage/shares), so editing always
                // starts from the exact figures — switch tabs to re-split differently.
                splitType: "EXACT",
                payers: exp.payments.map((p) => ({ ref: p.groupMemberId, value: Number(p.amount) })),
                splits: exp.splits.map((s) => ({ ref: s.groupMemberId, value: Number(s.amount) })),
              }}
              historyEntries={exp.history.map((h) => ({
                summary: h.summary,
                changedBy: h.changedBy,
                createdAt: h.createdAt.toISOString(),
              }))}
            />
          ))}
          {group.expenses.length === 0 && (
            <p className="py-3 text-sm text-text-muted">No expenses yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
