import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getContactBalanceByCurrency, getContactExpenses, getContactSettlements } from "@/lib/people";
import ExpenseListItem from "@/components/expenses/ExpenseListItem";
import PersonAddExpenseButton from "@/components/people/PersonAddExpenseButton";
import PersonBalanceActions from "@/components/people/PersonBalanceActions";
import PersonSettingsButton from "@/components/people/PersonSettingsButton";
import PersonShareLinkButton from "@/components/people/PersonShareLinkButton";
import PersonSettlementRow from "@/components/people/PersonSettlementRow";

export default async function PersonPage({
  params,
}: {
  params: { id: string };
}) {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!contact) notFound();

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) redirect("/login");

  const [byCurrency, expenses, settlements] = await Promise.all([
    getContactBalanceByCurrency(contact.id),
    getContactExpenses(contact.id),
    getContactSettlements(contact.id),
  ]);
  const outstanding = Object.entries(byCurrency).filter(
    ([, amt]) => Math.abs(amt) > 0.005,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/people"
        className="text-sm text-text-muted hover:text-primary"
      >
        ← All people
      </Link>
      <div className="mb-6 mt-1 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">{contact.name}</h1>
        <div className="flex items-center gap-2">
          <PersonSettingsButton
            person={{
              id: contact.id,
              name: contact.name,
              baseCurrency: contact.baseCurrency,
              email: contact.email,
              upiId: contact.upiId,
            }}
          />
          <PersonShareLinkButton personId={contact.id} />
          <PersonAddExpenseButton
            contact={{
              id: contact.id,
              name: contact.name,
              baseCurrency: contact.baseCurrency,
            }}
            userName={me.name}
          />
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Balance</h2>
        {outstanding.length === 0 ? (
          <p className="text-sm text-text-faint">Settled up.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {outstanding.map(([currency, amt]) => {
              // amt is the contact's own balance (positive = owed to them, i.e. you owe them) —
              // flip it so red/green always reflects the logged-in user's position.
              const userAmt = -amt;
              return (
                <li
                  key={currency}
                  className={userAmt > 0 ? "text-success-text" : "text-error"}
                >
                  {userAmt > 0 ? "Owes you" : "You owe"}{" "}
                  {Math.abs(userAmt).toFixed(2)} {currency}
                </li>
              );
            })}
          </ul>
        )}
        <PersonBalanceActions
          contactId={contact.id}
          contactName={contact.name}
          defaultCurrency={me.baseCurrency}
        />
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
                splitType: "EXACT", // stored splits are always resolved dollar amounts
                payers: exp.payments.map((p) => ({
                  ref: p.groupMemberId,
                  value: p.amount,
                })),
                splits: exp.splits.map((s) => ({
                  ref: s.groupMemberId,
                  value: s.amount,
                })),
              }}
              historyEntries={exp.history.map((h) => ({
                summary: h.summary,
                changedBy: h.changedBy,
                createdAt: h.createdAt.toISOString(),
              }))}
            />
          ))}
          {expenses.length === 0 && (
            <p className="py-3 text-sm text-text-muted">No expenses yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Payments</h2>
        <div className="divide-y divide-border">
          {settlements.map((s) => (
            <PersonSettlementRow
              key={s.id}
              fromName={s.fromName}
              toName={s.toName}
              dateLabel={new Date(s.date).toLocaleDateString()}
              amount={s.amount}
              currency={s.currency}
              note={s.note}
              groupName={s.groupName}
            />
          ))}
          {settlements.length === 0 && (
            <p className="py-3 text-sm text-text-muted">No payments recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
