import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import {
  computeGroupBalances,
  convertBalancesToCurrency,
  simplifyDebts,
  computePairwiseDebts,
  getGroupExpenseCurrencies,
} from "@/lib/balances";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: params.id, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const group = await prisma.group.findUnique({ where: { id: params.id }, select: { simplifyDebts: true } });
  const balances = await computeGroupBalances(params.id);
  const debts = group?.simplifyDebts ? simplifyDebts(balances) : await computePairwiseDebts(params.id);

  const expenseCurrencies = await getGroupExpenseCurrencies(params.id);
  const availableCurrencies = Array.from(new Set([...expenseCurrencies, me.baseCurrency]));

  const targetCurrency = req.nextUrl.searchParams.get("currency");
  if (targetCurrency) {
    const converted = await convertBalancesToCurrency(balances, targetCurrency);
    return NextResponse.json({
      balances: converted,
      native: balances, // per-currency breakdown, shown alongside the converted total
      debts,
      currency: targetCurrency,
      availableCurrencies,
    });
  }

  return NextResponse.json({ balances, native: balances, debts, availableCurrencies });
}
