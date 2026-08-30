import { prisma } from "../db";
import type { MemberBalance } from "./core";

export interface SimplifiedDebt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
}

// Unsimplified: A owes B and B owes C stay separate, unlike simplifyDebts().
export async function computePairwiseDebts(groupId: string): Promise<SimplifiedDebt[]> {
  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const nameById = new Map(members.map((m) => [m.id, m.displayName]));

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
    where: { groupId, deletedAt: null },
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
