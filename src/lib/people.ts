import { prisma } from "./db";
import { convert } from "./currency";
import { computeGroupBalances } from "./balances";

/** Net balance for a contact, per currency, across every group they belong to. */
export async function getContactBalanceByCurrency(contactId: string): Promise<Record<string, number>> {
  const members = await prisma.groupMember.findMany({ where: { contactId } });
  const totals: Record<string, number> = {};
  for (const m of members) {
    const balances = await computeGroupBalances(m.groupId);
    const mine = balances.find((b) => b.memberId === m.id);
    if (!mine) continue;
    for (const [currency, amount] of Object.entries(mine.byCurrency)) {
      totals[currency] = (totals[currency] || 0) + amount;
    }
  }
  return totals;
}

export interface PersonSummary {
  id: string;
  name: string;
  baseCurrency: string;
  groupNames: string[];
  total: number;
  skippedCurrencies: string[];
}

/** Every contact owned by the user, with their balance converted to the user's base currency. */
export async function getPeopleWithBalances(userId: string, targetCurrency: string): Promise<PersonSummary[]> {
  const contacts = await prisma.contact.findMany({
    where: { ownerId: userId },
    include: { groupMembers: { include: { group: { select: { name: true, isPersonal: true } } } } },
    orderBy: { name: "asc" },
  });

  const results: PersonSummary[] = [];
  for (const c of contacts) {
    const byCurrency = await getContactBalanceByCurrency(c.id);
    let total = 0;
    const skipped: string[] = [];
    for (const [currency, amount] of Object.entries(byCurrency)) {
      const converted = await convert(amount, currency, targetCurrency);
      if (converted === null) skipped.push(currency);
      else total += converted;
    }
    results.push({
      id: c.id,
      name: c.name,
      baseCurrency: c.baseCurrency,
      groupNames: c.groupMembers.filter((gm) => !gm.group.isPersonal).map((gm) => gm.group.name),
      total,
      skippedCurrencies: skipped,
    });
  }
  return results;
}
