import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeMemberOweOwed } from "@/lib/balances";

// The logged-in user's own owed/owe totals within this one group, converted
// to their base currency — feeds the "You owe" / "You are owed" summary cards.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: params.id, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await computeMemberOweOwed(params.id, membership.id, me.baseCurrency);
  return NextResponse.json({ ...result, baseCurrency: me.baseCurrency });
}
