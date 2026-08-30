import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getContactBalanceByCurrency,
  getContactExpenses,
  getContactSettlements,
  getUserBalanceByCurrency,
  getSharedUserExpenses,
  getSharedUserSettlements,
} from "@/lib/people";
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

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) redirect("/login");

  // A real linked co-member (added by email — see resolveMember in
  // src/lib/contacts.ts) has no Contact row, so it's addressed as
  // "user:<uuid>" here instead of a bare Contact id. Unlike route handlers,
  // page params aren't auto-decoded, so the ":" arrives as "%3A".
  const id = decodeURIComponent(params.id);
  const isRealUser = id.startsWith("user:");
  const otherUserId = isRealUser ? id.slice("user:".length) : null;

  const contact = isRealUser
    ? null
    : await prisma.contact.findFirst({ where: { id, ownerId: session.userId } });
  const otherUser = otherUserId
    ? await prisma.user.findFirst({
        where: { id: otherUserId, groupMembers: { some: { group: { members: { some: { userId: session.userId } } } } } },
      })
    : null;
  if (!contact && !otherUser) notFound();

  const person = contact
    ? { id: contact.id, name: contact.name, baseCurrency: contact.baseCurrency, email: contact.email, upiId: contact.upiId }
    : { id, name: otherUser!.name, baseCurrency: otherUser!.baseCurrency, email: otherUser!.email, upiId: null };

  const [byCurrency, expenses, settlements] = contact
    ? await Promise.all([
        getContactBalanceByCurrency(contact.id),
        getContactExpenses(contact.id),
        getContactSettlements(contact.id),
      ])
    : await Promise.all([
        getUserBalanceByCurrency(session.userId, otherUserId!),
        getSharedUserExpenses(session.userId, otherUserId!),
        getSharedUserSettlements(session.userId, otherUserId!),
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
        <h1 className="text-2xl font-semibold text-text">{person.name}</h1>
        <div className="flex items-center gap-2">
          {contact && (
            <>
              <PersonSettingsButton person={{ ...person, id: contact.id }} />
              <PersonShareLinkButton personId={contact.id} />
            </>
          )}
          <PersonAddExpenseButton
            person={{ ...person, kind: contact ? "contact" : "user" }}
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
          contactId={person.id}
          contactName={person.name}
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
              deletedAt={exp.deletedAt}
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
