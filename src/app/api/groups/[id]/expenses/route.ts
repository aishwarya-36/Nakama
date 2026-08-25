import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeSplitRows } from "@/lib/splits";

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
    include: { splits: true, paidBy: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ expenses });
}

const baseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidById: z.string().uuid(),
  date: z.string().datetime().optional(),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE"]).default("EQUAL"),
  // EQUAL: which members share it. EXACT: [{groupMemberId, amount}]. PERCENTAGE: [{groupMemberId, percentage}]
  memberIds: z.array(z.string().uuid()).optional(),
  splits: z.array(z.object({ groupMemberId: z.string().uuid(), value: z.number() })).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = baseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { description, amount, currency, paidById, splitType, date } = parsed.data;

  // Make sure paidById and any referenced members actually belong to this group.
  const groupMembers = await prisma.groupMember.findMany({ where: { groupId: params.id } });
  const validIds = new Set(groupMembers.map((m) => m.id));
  if (!validIds.has(paidById)) {
    return NextResponse.json({ error: "paidById is not a member of this group" }, { status: 400 });
  }

  const result = computeSplitRows(
    splitType,
    amount,
    validIds,
    groupMembers.map((m) => m.id),
    parsed.data.memberIds,
    parsed.data.splits?.map((s) => ({ id: s.groupMemberId, value: s.value }))
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const splitRows = result.map((r) => ({ groupMemberId: r.id, amount: r.amount }));

  const expense = await prisma.expense.create({
    data: {
      groupId: params.id,
      description,
      amount,
      currency,
      paidById,
      splitType,
      date: date ? new Date(date) : undefined,
      splits: { create: splitRows },
    },
    include: { splits: true, paidBy: true },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
