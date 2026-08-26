import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeGroupBalances } from "@/lib/balances";

// POST: the current user leaves the group. Only allowed once their own balance
// nets to zero in every currency (they don't owe anyone, and no one owes them).
// Rather than deleting the GroupMember row (which would violate the RESTRICT
// foreign keys from past ExpenseSplit/ExpensePayment rows), this unlinks the
// user from it — same pattern as an unclaimed guest — so history stays intact.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: params.id, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "You're not a member of this group" }, { status: 403 });

  const balances = await computeGroupBalances(params.id);
  const mine = balances.find((b) => b.memberId === membership.id);
  const outstanding = mine ? Object.entries(mine.byCurrency).filter(([, amt]) => Math.abs(amt) > 0.005) : [];
  if (outstanding.length > 0) {
    const summary = outstanding
      .map(([currency, amt]) => `${amt > 0 ? "owed" : "owes"} ${Math.abs(amt).toFixed(2)} ${currency}`)
      .join(", ");
    return NextResponse.json({ error: `You still have an outstanding balance: ${summary}` }, { status: 409 });
  }

  await prisma.groupMember.update({ where: { id: membership.id }, data: { userId: null } });
  return NextResponse.json({ ok: true });
}
