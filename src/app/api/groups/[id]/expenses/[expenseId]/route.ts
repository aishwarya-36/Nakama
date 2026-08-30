import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeSplitRows, validatePayers } from "@/lib/splits";
import { diffExpense, type ExpenseSnapshot } from "@/lib/expenseHistory";
import { expenseWithGroupMemberIdsSchema } from "@/lib/expenseSchemas";

async function assertMember(groupId: string, userId: string) {
  return !!(await prisma.groupMember.findFirst({ where: { groupId, userId } }));
}

const patchSchema = expenseWithGroupMemberIdsSchema;

// GET: expense + group members + history, for the edit modal.
export async function GET(_req: Request, { params }: { params: { id: string; expenseId: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [expense, members, group, actor] = await Promise.all([
    prisma.expense.findFirst({
      where: { id: params.expenseId, groupId: params.id },
      include: {
        splits: true,
        payments: { include: { groupMember: true } },
        history: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.groupMember.findMany({ where: { groupId: params.id } }),
    prisma.group.findUnique({ where: { id: params.id }, select: { isPersonal: true, name: true } }),
    prisma.groupMember.findFirst({ where: { groupId: params.id, userId: session.userId } }),
  ]);
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  return NextResponse.json({ expense, members, group, selfMemberId: actor?.id });
}

// PATCH: replace payments/splits, record a history entry.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.expense.findFirst({
    where: { id: params.expenseId, groupId: params.id, deletedAt: null },
    include: { splits: true, payments: true },
  });
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
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

  const before: ExpenseSnapshot = {
    description: existing.description,
    amount: Number(existing.amount),
    currency: existing.currency,
    category: existing.category,
    notes: existing.notes,
    date: existing.date,
    splitType: existing.splitType,
    payments: existing.payments.map((p) => ({ groupMemberId: p.groupMemberId, amount: Number(p.amount) })),
    splits: existing.splits.map((s) => ({ groupMemberId: s.groupMemberId, amount: Number(s.amount) })),
  };
  const newDate = date ? new Date(date) : existing.date;
  const after: ExpenseSnapshot = {
    description,
    amount,
    currency,
    category: category || null,
    notes: notes || null,
    date: newDate,
    splitType,
    payments: paymentRows.map((p) => ({ groupMemberId: p.groupMemberId, amount: p.amount })),
    splits: splitRows.map((s) => ({ groupMemberId: s.groupMemberId, amount: s.amount })),
  };
  const memberNames = Object.fromEntries(groupMembers.map((m) => [m.id, m.displayName]));
  const changes = diffExpense(before, after, memberNames);

  const actor = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: session.userId } });

  const expense = await prisma.$transaction(async (tx) => {
    await tx.expensePayment.deleteMany({ where: { expenseId: params.expenseId } });
    await tx.expenseSplit.deleteMany({ where: { expenseId: params.expenseId } });
    const updated = await tx.expense.update({
      where: { id: params.expenseId },
      data: {
        description,
        amount,
        currency,
        category: category || null,
        notes: notes || null,
        splitType,
        date: newDate,
        payments: { create: paymentRows },
        splits: { create: splitRows },
      },
      include: { splits: true, payments: { include: { groupMember: true } } },
    });
    if (changes.length > 0) {
      await tx.expenseHistory.create({
        data: {
          expenseId: params.expenseId,
          changedBy: actor?.displayName || "Someone",
          actorUserId: session.userId,
          summary: changes.join("; "),
        },
      });
    }
    return updated;
  });

  return NextResponse.json({ expense });
}

// DELETE: soft delete — excluded from balance math from then on, but stays
// visible (struck through) in listings and recorded in history.
export async function DELETE(_req: Request, { params }: { params: { id: string; expenseId: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.expense.findFirst({
    where: { id: params.expenseId, groupId: params.id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const actor = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: session.userId } });

  await prisma.$transaction([
    prisma.expense.update({ where: { id: params.expenseId }, data: { deletedAt: new Date() } }),
    prisma.expenseHistory.create({
      data: {
        expenseId: params.expenseId,
        changedBy: actor?.displayName || "Someone",
        actorUserId: session.userId,
        summary: "Deleted",
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
