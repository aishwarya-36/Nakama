import { prisma } from "../db";
import { convert } from "../currency";
import { EXPENSE_CATEGORIES } from "../categories";
import { computeGroupBalances } from "./core";

const KNOWN_CATEGORY_KEYS = new Set(EXPENSE_CATEGORIES.map((c) => c.key as string).filter((k) => k !== "other"));

export async function computeMemberOweOwed(
  groupId: string,
  memberId: string,
  targetCurrency: string
): Promise<{
  owed: number;
  owe: number;
  byCurrency: Record<string, { owedToYou: number; youOwe: number }>;
  skippedCurrencies: string[];
}> {
  const balances = await computeGroupBalances(groupId);
  const mine = balances.find((b) => b.memberId === memberId);

  let owed = 0;
  let owe = 0;
  const byCurrency: Record<string, { owedToYou: number; youOwe: number }> = {};
  const skipped: string[] = [];

  if (mine) {
    for (const [currency, amount] of Object.entries(mine.byCurrency)) {
      byCurrency[currency] = { owedToYou: amount > 0 ? amount : 0, youOwe: amount < 0 ? -amount : 0 };
      const converted = await convert(amount, currency, targetCurrency);
      if (converted === null) {
        skipped.push(currency);
        continue;
      }
      if (converted > 0) owed += converted;
      else owe += -converted;
    }
  }

  return { owed, owe, byCurrency, skippedCurrencies: skipped };
}

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
  const byCurrency: Record<string, { owedToYou: number; youOwe: number }> = {};

  for (const m of myMemberships) {
    const balances = await computeGroupBalances(m.groupId);
    const mine = balances.find((b) => b.memberId === m.id);
    let groupNet = 0;
    if (mine) {
      for (const [currency, amount] of Object.entries(mine.byCurrency)) {
        if (!byCurrency[currency]) byCurrency[currency] = { owedToYou: 0, youOwe: 0 };
        if (amount > 0) byCurrency[currency].owedToYou += amount;
        else byCurrency[currency].youOwe += -amount;

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
    byCurrency,
    skippedCurrencies: Array.from(skippedCurrencies),
    groupCount: myMemberships.length,
  };
}

export async function computeMonthlySpending(userId: string, baseCurrency: string, months = 6) {
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
