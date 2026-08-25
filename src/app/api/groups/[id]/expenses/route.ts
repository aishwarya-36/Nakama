import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

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

function roundCents(n: number) {
  return Math.round(n * 100) / 100;
}

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

  let splitRows: { groupMemberId: string; amount: number }[] = [];

  if (splitType === "EQUAL") {
    const memberIds = parsed.data.memberIds?.length ? parsed.data.memberIds : groupMembers.map((m) => m.id);
    for (const id of memberIds) {
      if (!validIds.has(id)) return NextResponse.json({ error: "Invalid member in split" }, { status: 400 });
    }
    const share = roundCents(amount / memberIds.length);
    splitRows = memberIds.map((id, i) => ({
      groupMemberId: id,
      // give any leftover cents (from rounding) to the last person
      amount: i === memberIds.length - 1 ? roundCents(amount - share * (memberIds.length - 1)) : share,
    }));
  } else if (splitType === "EXACT") {
    const splits = parsed.data.splits || [];
    for (const s of splits) {
      if (!validIds.has(s.groupMemberId)) return NextResponse.json({ error: "Invalid member in split" }, { status: 400 });
    }
    const sum = roundCents(splits.reduce((acc, s) => acc + s.value, 0));
    if (sum !== roundCents(amount)) {
      return NextResponse.json({ error: `Exact splits (${sum}) must add up to the total (${amount})` }, { status: 400 });
    }
    splitRows = splits.map((s) => ({ groupMemberId: s.groupMemberId, amount: roundCents(s.value) }));
  } else {
    // PERCENTAGE
    const splits = parsed.data.splits || [];
    for (const s of splits) {
      if (!validIds.has(s.groupMemberId)) return NextResponse.json({ error: "Invalid member in split" }, { status: 400 });
    }
    const pctSum = roundCents(splits.reduce((acc, s) => acc + s.value, 0));
    if (pctSum !== 100) {
      return NextResponse.json({ error: `Percentages must add up to 100 (got ${pctSum})` }, { status: 400 });
    }
    splitRows = splits.map((s) => ({ groupMemberId: s.groupMemberId, amount: roundCents((s.value / 100) * amount) }));
  }

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
