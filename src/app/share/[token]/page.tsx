import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  getContactBalanceByCurrency,
  getContactExpenses,
  getContactSettlements,
} from "@/lib/people";
import ShareExpenseRow from "@/components/share/ShareExpenseRow";
import PersonSettlementRow from "@/components/people/PersonSettlementRow";

export default async function SharePage({
  params,
}: {
  params: { token: string };
}) {
  const contact = await prisma.contact.findUnique({
    where: { shareToken: params.token },
    include: { owner: { select: { name: true } } },
  });
  if (!contact) notFound();

  const [byCurrency, expenses, settlements] = await Promise.all([
    getContactBalanceByCurrency(contact.id),
    getContactExpenses(contact.id),
    getContactSettlements(contact.id),
  ]);
  const outstanding = Object.entries(byCurrency).filter(
    ([, amt]) => Math.abs(amt) > 0.005,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-text-muted">
        Read-only view · no login required
      </p>
      <h1 className="mb-1 mt-1 text-2xl font-semibold text-text">
        Your balance with {contact.owner.name}
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        This link only shows expenses and payments between you and{" "}
        {contact.owner.name} — you can't edit anything here.
      </p>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Balance</h2>
        {outstanding.length === 0 ? (
          <p className="text-sm text-text-faint">Settled up.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {outstanding.map(([currency, amt]) => (
              <li
                key={currency}
                className={amt > 0 ? "text-success-text" : "text-error"}
              >
                {amt > 0 ? "Owes you" : "You owe"} {Math.abs(amt).toFixed(2)}{" "}
                {currency}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-text">Expenses</h2>
        <div className="divide-y divide-border">
          {expenses.map((exp) => (
            <ShareExpenseRow
              key={exp.id}
              description={exp.description}
              paidByLabel={exp.paidByLabel}
              dateLabel={new Date(exp.date).toLocaleDateString()}
              category={exp.category}
              notes={exp.notes}
              amount={exp.amount}
              currency={exp.currency}
              contextLabel={exp.groupName}
              members={exp.members}
              splits={exp.splits}
            />
          ))}
          {expenses.length === 0 && (
            <p className="py-3 text-sm text-text-muted">No expenses yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
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
            <p className="py-3 text-sm text-text-muted">
              No payments recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
