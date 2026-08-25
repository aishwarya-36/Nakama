import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeMonthlySpending } from "@/lib/balances";

export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const months = Number(req.nextUrl.searchParams.get("months")) || 6;
  const data = await computeMonthlySpending(user.id, user.baseCurrency, months);
  return NextResponse.json({ months: data, baseCurrency: user.baseCurrency });
}
