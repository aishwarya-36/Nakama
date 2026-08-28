import { prisma } from "./db";
import { convert } from "./currency";
import { EXPENSE_CATEGORIES } from "./categories";

const KNOWN_CATEGORY_KEYS = new Set(EXPENSE_CATEGORIES.map((c) => c.key as string).filter((k) => k !== "other"));

export interface MemberBalance {
  memberId: string;
  displayName: string;
  // net balance per currency: positive = group owes them, negative = they owe the group
  byCurrency: Record<string, number>;
}

export interface SimplifiedDebt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
}

/**
 * Net balance per member, per currency, based on expenses + splits + settlements.
 * Currencies are kept separate here (no conversion) — conversion only happens
 * at display time via convertBalancesToCurrency().
 */
export async function computeGroupBalances(
  groupId: string
): Promise<MemberBalance[]> {
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

/** Converts every member's multi-currency balance into a single target currency total.
 *  Currencies with no known rate are skipped from the total and listed in `skipped`. */
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

/** Distinct currencies actually used in a group's expenses (for the balances currency picker). */
export async function getGroupExpenseCurrencies(groupId: string): Promise<string[]> {
  const rows = await prisma.expense.findMany({
    where: { groupId },
    select: { currency: true },
    distinct: ["currency"],
  });
  return rows.map((r) => r.currency);
}

/**
 * Personal overview across every group the user belongs to: net balance
 * (converted to their base currency) and simple totals for the Home/Expenses pages.
 */
export async function computeUserOverview(userId: string, baseCurrency: string) {
  const myMemberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { id: true, groupId: true, group: { select: { name: true, isPersonal: true, personalKey: true } } },
  });
  const soloKey = `solo:${userId}`;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let totalOwedToYou = 0;
  let totalYouOwe = 0;
  let totalPaidByYou = 0;
  let totalYourShare = 0;
  let thisMonthGroupSpend = 0;
  let thisMonthPersonalSpend = 0;
  const skippedCurrencies = new Set<string>();
  const perGroup: { groupId: string; groupName: string; net: number }[] = [];

  for (const m of myMemberships) {
    const balances = await computeGroupBalances(m.groupId);
    const mine = balances.find((b) => b.memberId === m.id);
    let groupNet = 0;
    if (mine) {
      for (const [currency, amount] of Object.entries(mine.byCurrency)) {
        const converted = await convert(amount, currency, baseCurrency);
        if (converted === null) {
          skippedCurrencies.add(currency);
          continue;
        }
        groupNet += converted;
        if (converted > 0) totalOwedToYou += converted;
        else totalYouOwe += -converted;
      }
    }
    perGroup.push({ groupId: m.groupId, groupName: m.group.name, net: groupNet });

    const expenses = await prisma.expense.findMany({
      where: { groupId: m.groupId },
      include: {
        splits: { where: { groupMemberId: m.id } },
        payments: { where: { groupMemberId: m.id } },
      },
    });
    for (const exp of expenses) {
      for (const payment of exp.payments) {
        const converted = await convert(Number(payment.amount), exp.currency, baseCurrency);
        if (converted !== null) totalPaidByYou += converted;
      }
      for (const split of exp.splits) {
        const converted = await convert(Number(split.amount), exp.currency, baseCurrency);
        if (converted !== null) {
          totalYourShare += converted;
          if (exp.date >= monthStart) {
            const isSolo = m.group.isPersonal && m.group.personalKey === soloKey;
            if (isSolo) thisMonthPersonalSpend += converted;
            else thisMonthGroupSpend += converted;
          }
        }
      }
    }
  }

  return {
    baseCurrency,
    netBalance: totalOwedToYou - totalYouOwe,
    totalOwedToYou,
    totalYouOwe,
    totalPaidByYou,
    totalYourShare,
    thisMonthTotal: thisMonthGroupSpend + thisMonthPersonalSpend,
    thisMonthGroupSpend,
    thisMonthPersonalSpend,
    perGroup,
    skippedCurrencies: Array.from(skippedCurrencies),
    groupCount: myMemberships.length,
  };
}

/** "Your share" of expenses grouped by month, for the last `months` months — for a bar chart. */
export async function computeMonthlySpending(
  userId: string,
  baseCurrency: string,
  months = 6
) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const myMemberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { id: true },
  });
  const memberIds = myMemberships.map((m) => m.id);

  const splits = await prisma.expenseSplit.findMany({
    where: { groupMemberId: { in: memberIds }, expense: { date: { gte: since } } },
    include: { expense: { select: { date: true, currency: true, category: true } } },
  });

  const emptyCategories = () =>
    Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, 0])) as Record<string, number>;

  const buckets = new Map<string, { total: number; byCategory: Record<string, number> }>(); // "YYYY-MM" -> totals
  // pre-seed so months with no spending still show a 0 bar
  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, {
      total: 0,
      byCategory: emptyCategories(),
    });
  }

  for (const s of splits) {
    const d = s.expense.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const converted = await convert(Number(s.amount), s.expense.currency, baseCurrency);
    if (converted === null) continue;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const categoryKey = s.expense.category && KNOWN_CATEGORY_KEYS.has(s.expense.category) ? s.expense.category : "other";
    bucket.total += converted;
    bucket.byCategory[categoryKey] += converted;
  }

  return Array.from(buckets.entries()).map(([month, b]) => ({
    month,
    total: Math.round(b.total * 100) / 100,
    byCategory: Object.fromEntries(
      Object.entries(b.byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
  }));
}
/**
 * Actual pairwise debts (unsimplified): who owes whom directly, from each expense's
 * splits attributed proportionally to that expense's payers, netted only within each
 * (ower, payer) pair — never collapsed across the whole group. So A owes B and B owes
 * C stay as two separate debts instead of being reduced to "A owes C".
 */
export async function computePairwiseDebts(groupId: string): Promise<SimplifiedDebt[]> {
  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const nameById = new Map(members.map((m) => [m.id, m.displayName]));

  // owed[ower][payer][currency] = how much `ower` owes `payer`
  const owed = new Map<string, Map<string, Record<string, number>>>();
  const bump = (owerId: string, payerId: string, currency: string, amount: number) => {
    if (owerId === payerId || amount === 0) return;
    if (!owed.has(owerId)) owed.set(owerId, new Map());
    const byPayer = owed.get(owerId)!;
    if (!byPayer.has(payerId)) byPayer.set(payerId, {});
    const byCurrency = byPayer.get(payerId)!;
    byCurrency[currency] = (byCurrency[currency] || 0) + amount;
  };

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true, payments: true },
  });
  for (const exp of expenses) {
    const totalPaid = exp.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalPaid === 0) continue;
    for (const split of exp.splits) {
      const oweAmount = Number(split.amount);
      for (const payment of exp.payments) {
        const share = Number(payment.amount) / totalPaid;
        bump(split.groupMemberId, payment.groupMemberId, exp.currency, oweAmount * share);
      }
    }
  }

  const settlements = await prisma.settlement.findMany({ where: { groupId } });
  for (const s of settlements) {
    bump(s.fromMemberId, s.toMemberId, s.currency, -Number(s.amount));
  }

  const result: SimplifiedDebt[] = [];
  const seenPairs = new Set<string>();
  for (const [owerId, byPayer] of owed) {
    for (const [payerId, byCurrency] of byPayer) {
      const pairKey = [owerId, payerId].sort().join("|");
      for (const currency of Object.keys(byCurrency)) {
        const key = `${pairKey}|${currency}`;
        if (seenPairs.has(key)) continue; // already netted this pair+currency from the other direction
        seenPairs.add(key);

        const forward = owed.get(owerId)?.get(payerId)?.[currency] || 0;
        const backward = owed.get(payerId)?.get(owerId)?.[currency] || 0;
        const net = forward - backward;
        if (Math.abs(net) < 0.005) continue;

        const [fromId, toId] = net > 0 ? [owerId, payerId] : [payerId, owerId];
        result.push({
          fromMemberId: fromId,
          fromName: nameById.get(fromId) || "",
          toMemberId: toId,
          toName: nameById.get(toId) || "",
          amount: Math.round(Math.abs(net) * 100) / 100,
          currency,
        });
      }
    }
  }

  return result;
}

export function simplifyDebts(balances: MemberBalance[]): SimplifiedDebt[] {
  const currencies = new Set<string>();
  balances.forEach((b) => Object.keys(b.byCurrency).forEach((c) => currencies.add(c)));

  const nameById = new Map(balances.map((b) => [b.memberId, b.displayName]));
  const result: SimplifiedDebt[] = [];

  for (const currency of currencies) {
    const creditors: { id: string; amt: number }[] = [];
    const debtors: { id: string; amt: number }[] = [];

    for (const b of balances) {
      const amt = b.byCurrency[currency] || 0;
      if (amt > 0.005) creditors.push({ id: b.memberId, amt });
      else if (amt < -0.005) debtors.push({ id: b.memberId, amt: -amt });
    }

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const settled = Math.min(debtors[i].amt, creditors[j].amt);
      result.push({
        fromMemberId: debtors[i].id,
        fromName: nameById.get(debtors[i].id) || "",
        toMemberId: creditors[j].id,
        toName: nameById.get(creditors[j].id) || "",
        amount: Math.round(settled * 100) / 100,
        currency,
      });
      debtors[i].amt -= settled;
      creditors[j].amt -= settled;
      if (debtors[i].amt < 0.005) i++;
      if (creditors[j].amt < 0.005) j++;
    }
  }

  return result;
}
