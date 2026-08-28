import { prisma } from "./db";
import { convert } from "./currency";
import { computeGroupBalances } from "./balances";

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

export interface ContactExpenseRow {
  id: string;
  groupId: string;
  groupName: string;
  date: Date;
  description: string;
  category: string | null;
  notes: string | null;
  currency: string;
  amount: number;
  paidByLabel: string;
  members: { id: string; displayName: string }[];
  payments: { groupMemberId: string; amount: number }[];
  splits: { groupMemberId: string; amount: number }[];
  history: { summary: string; changedBy: string; createdAt: Date }[];
}

export async function getContactExpenses(contactId: string): Promise<ContactExpenseRow[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { contactId },
    select: { id: true, groupId: true },
  });
  if (memberships.length === 0) return [];
  const memberIds = memberships.map((m) => m.id);
  const groupIds = [...new Set(memberships.map((m) => m.groupId))];

  const expenses = await prisma.expense.findMany({
    where: {
      groupId: { in: groupIds },
      OR: [
        { splits: { some: { groupMemberId: { in: memberIds } } } },
        { payments: { some: { groupMemberId: { in: memberIds } } } },
      ],
    },
    include: {
      group: { select: { name: true, isPersonal: true, members: { select: { id: true, displayName: true } } } },
      payments: { include: { groupMember: { select: { displayName: true } } } },
      splits: true,
      history: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { date: "desc" },
  });

  return expenses.map((e) => ({
    id: e.id,
    groupId: e.groupId,
    groupName: e.group.isPersonal ? "Direct expense" : e.group.name,
    date: e.date,
    description: e.description,
    category: e.category,
    notes: e.notes,
    currency: e.currency,
    amount: Number(e.amount),
    paidByLabel:
      e.payments.length === 0
        ? "—"
        : e.payments.length === 1
          ? e.payments[0].groupMember.displayName
          : e.payments.map((p) => p.groupMember.displayName).join(", "),
    members: e.group.members,
    payments: e.payments.map((p) => ({ groupMemberId: p.groupMemberId, amount: Number(p.amount) })),
    splits: e.splits.map((s) => ({ groupMemberId: s.groupMemberId, amount: Number(s.amount) })),
    history: e.history,
  }));
}

export interface ContactSettlementRow {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  note: string | null;
  fromName: string;
  toName: string;
  groupName: string;
}

export async function getContactSettlements(contactId: string): Promise<ContactSettlementRow[]> {
  const memberships = await prisma.groupMember.findMany({ where: { contactId }, select: { id: true } });
  if (memberships.length === 0) return [];
  const memberIds = memberships.map((m) => m.id);

  const settlements = await prisma.settlement.findMany({
    where: { OR: [{ fromMemberId: { in: memberIds } }, { toMemberId: { in: memberIds } }] },
    include: {
      fromMember: { select: { displayName: true } },
      toMember: { select: { displayName: true } },
      group: { select: { name: true, isPersonal: true } },
    },
    orderBy: { date: "desc" },
  });

  return settlements.map((s) => ({
    id: s.id,
    date: s.date,
    amount: Number(s.amount),
    currency: s.currency,
    note: s.note,
    fromName: s.fromMember.displayName,
    toName: s.toMember.displayName,
    groupName: s.group.isPersonal ? "Direct" : s.group.name,
  }));
}

export const PEOPLE_PAGE_SIZE = 15;

export interface PersonSummary {
  id: string;
  name: string;
  baseCurrency: string;
  email: string | null;
  upiId: string | null;
  groupNames: string[];
  total: number;
  byCurrency: Record<string, number>;
  skippedCurrencies: string[];
}

export async function getPeopleWithBalances(
  userId: string,
  targetCurrency: string,
  opts: { q?: string; skip?: number; take?: number } = {}
): Promise<{ people: PersonSummary[]; total: number }> {
  const where = {
    ownerId: userId,
    ...(opts.q ? { name: { contains: opts.q, mode: "insensitive" as const } } : {}),
  };

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: { groupMembers: { include: { group: { select: { name: true, isPersonal: true } } } } },
      orderBy: { name: "asc" },
      skip: opts.skip,
      take: opts.take,
    }),
  ]);

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
      email: c.email,
      upiId: c.upiId,
      groupNames: c.groupMembers.filter((gm) => !gm.group.isPersonal).map((gm) => gm.group.name),
      total,
      byCurrency,
      skippedCurrencies: skipped,
    });
  }
  return { people: results, total };
}
