import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

const schema = z.object({
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  note: z.string().optional(),
});

// Records a payment from one group member to another — either settling down
// an existing debt (partially or in full) or an advance with no debt behind
// it yet. computeGroupBalances() already folds Settlement rows into balances,
// so nothing else needs to change once this is written.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: params.id, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { fromMemberId, toMemberId, amount, currency, note } = parsed.data;

  if (fromMemberId === toMemberId) {
    return NextResponse.json({ error: "Payer and recipient must be different people" }, { status: 400 });
  }

  const groupMembers = await prisma.groupMember.findMany({ where: { groupId: params.id }, select: { id: true } });
  const validIds = new Set(groupMembers.map((m) => m.id));
  if (!validIds.has(fromMemberId) || !validIds.has(toMemberId)) {
    return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId: params.id,
      fromMemberId,
      toMemberId,
      amount,
      currency,
      note: note || null,
      recordedById: session.userId,
    },
  });
  return NextResponse.json({ settlement });
}
