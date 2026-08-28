import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { createExpense } from "@/lib/expenses";
import { expenseWithGroupMemberIdsSchema } from "@/lib/expenseSchemas";

async function assertMember(groupId: string, userId: string) {
  return !!(await prisma.groupMember.findFirst({ where: { groupId, userId } }));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const expenses = await prisma.expense.findMany({
    where: { groupId: params.id },
    include: { splits: true, payments: { include: { groupMember: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = expenseWithGroupMemberIdsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { description, amount, currency, category, notes, splitType, date, payers, memberIds, splits } = parsed.data;

  const actor = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: session.userId } });

  const result = await createExpense({
    groupId: params.id,
    description,
    amount,
    currency,
    category,
    notes,
    date,
    splitType,
    payers: payers.map((p) => ({ id: p.groupMemberId, value: p.value })),
    memberIds,
    splits: splits?.map((s) => ({ id: s.groupMemberId, value: s.value })),
    changedBy: actor?.displayName || "Someone",
    actorUserId: session.userId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ expense: result.expense }, { status: 201 });
}
