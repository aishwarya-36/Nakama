import { prisma } from "../db";
import { convert } from "../currency";

export interface MemberBalance {
  memberId: string;
  displayName: string;
  byCurrency: Record<string, number>; // positive = owed to them, negative = they owe
}

export async function computeGroupBalances(groupId: string): Promise<MemberBalance[]> {
  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const balances = new Map<string, MemberBalance>();
  for (const m of members) {
    balances.set(m.id, { memberId: m.id, displayName: m.displayName, byCurrency: {} });
  }

  const bump = (memberId: string, currency: string, delta: number) => {
    const b = balances.get(memberId);
    if (!b) return;
    b.byCurrency[currency] = (b.byCurrency[currency] || 0) + delta;
  };

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true, payments: true },
  });
  for (const exp of expenses) {
    for (const payment of exp.payments) {
      bump(payment.groupMemberId, exp.currency, Number(payment.amount)); // each payer is owed what they put in...
    }
    for (const split of exp.splits) {
      bump(split.groupMemberId, exp.currency, -Number(split.amount)); // ...minus what everyone (incl. payers) owes
    }
  }

  const settlements = await prisma.settlement.findMany({ where: { groupId } });
  for (const s of settlements) {
    const amount = Number(s.amount);
    bump(s.fromMemberId, s.currency, amount); // paying down what you owed
    bump(s.toMemberId, s.currency, -amount); // received payment, owed less now
  }

  return Array.from(balances.values());
}

export async function convertBalancesToCurrency(
  balances: MemberBalance[],
  targetCurrency: string
): Promise<{ memberId: string; displayName: string; total: number; skippedCurrencies: string[] }[]> {
  const results = [];
  for (const b of balances) {
    let total = 0;
    const skipped: string[] = [];
    for (const [currency, amount] of Object.entries(b.byCurrency)) {
      const converted = await convert(amount, currency, targetCurrency);
      if (converted === null) skipped.push(currency);
      else total += converted;
    }
    results.push({ memberId: b.memberId, displayName: b.displayName, total, skippedCurrencies: skipped });
  }
  return results;
}

export async function getGroupExpenseCurrencies(groupId: string): Promise<string[]> {
  const rows = await prisma.expense.findMany({
    where: { groupId },
    select: { currency: true },
    distinct: ["currency"],
  });
  return rows.map((r) => r.currency);
}
