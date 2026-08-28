import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeSplitRows, validatePayers } from "@/lib/splits";

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

const baseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().optional(),
  payers: z.array(z.object({ groupMemberId: z.string().uuid(), value: z.number() })).min(1),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]).default("EQUAL"),
  // EQUAL: which members share it. EXACT: [{groupMemberId, amount}]. PERCENTAGE/SHARES: [{groupMemberId, value}]
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
  const { description, amount, currency, category, notes, splitType, date, payers } = parsed.data;

  const groupMembers = await prisma.groupMember.findMany({ where: { groupId: params.id } });
  const validIds = new Set(groupMembers.map((m) => m.id));

  const payerResult = validatePayers(
    payers.map((p) => ({ id: p.groupMemberId, value: p.value })),
    amount,
    validIds
  );
  if ("error" in payerResult) {
    return NextResponse.json({ error: payerResult.error }, { status: 400 });
  }
  const paymentRows = payerResult.map((r) => ({ groupMemberId: r.id, amount: r.amount }));

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

  const actor = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: session.userId } });

  const expense = await prisma.expense.create({
    data: {
      groupId: params.id,
      description,
      amount,
      currency,
      category: category || null,
      notes: notes || null,
      splitType,
      date: date ? new Date(date) : undefined,
      payments: { create: paymentRows },
      splits: { create: splitRows },
      history: { create: { changedBy: actor?.displayName || "Someone", actorUserId: session.userId, summary: "Created" } },
    },
    include: { splits: true, payments: { include: { groupMember: true } } },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
