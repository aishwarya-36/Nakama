import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getContactBalanceByCurrency, getContactExpenses } from "@/lib/people";
import ExpenseListItem from "@/components/ExpenseListItem";

export default async function PersonPage({ params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!contact) notFound();

  const [byCurrency, expenses] = await Promise.all([
    getContactBalanceByCurrency(contact.id),
    getContactExpenses(contact.id),
  ]);
  const outstanding = Object.entries(byCurrency).filter(([, amt]) => Math.abs(amt) > 0.005);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/people" className="text-sm text-text-muted hover:text-primary">
        ← All people
      </Link>
      <div className="mb-6 mt-1">
        <h1 className="text-2xl font-semibold text-text">{contact.name}</h1>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Balance</h2>
        {outstanding.length === 0 ? (
          <p className="text-sm text-text-faint">Settled up.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {outstanding.map(([currency, amt]) => (
              <li key={currency} className={amt > 0 ? "text-success-text" : "text-error"}>
                {amt > 0 ? "Owed" : "Owes"} {Math.abs(amt).toFixed(2)} {currency}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Expenses</h2>
        <div className="divide-y divide-border">
          {expenses.map((exp) => (
            <ExpenseListItem
              key={exp.id}
              groupId={exp.groupId}
              expenseId={exp.id}
              members={exp.members}
              description={exp.description}
              paidByLabel={exp.paidByLabel}
              dateLabel={new Date(exp.date).toLocaleDateString()}
              category={exp.category}
              amount={exp.amount}
              currency={exp.currency}
              contextLabel={exp.groupName}
              initial={{
                description: exp.description,
                amount: exp.amount,
                currency: exp.currency,
                category: exp.category || "",
                notes: exp.notes || "",
                date: exp.date.toISOString().slice(0, 10),
                // Stored splits are always resolved dollar amounts regardless of the
                // original split type, so editing always starts from exact figures.
                splitType: "EXACT",
                payers: exp.payments.map((p) => ({ ref: p.groupMemberId, value: p.amount })),
                splits: exp.splits.map((s) => ({ ref: s.groupMemberId, value: s.amount })),
              }}
              historyEntries={exp.history.map((h) => ({
                summary: h.summary,
                changedBy: h.changedBy,
                createdAt: h.createdAt.toISOString(),
              }))}
            />
          ))}
          {expenses.length === 0 && <p className="py-3 text-sm text-text-muted">No expenses yet.</p>}
        </div>
      </div>
    </div>
  );
}
