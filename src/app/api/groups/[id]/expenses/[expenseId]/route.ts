import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computeSplitRows, validatePayers } from "@/lib/splits";
import { diffExpense, type ExpenseSnapshot } from "@/lib/expenseHistory";

async function assertMember(groupId: string, userId: string) {
  return !!(await prisma.groupMember.findFirst({ where: { groupId, userId } }));
}

const patchSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().datetime().optional(),
  payers: z.array(z.object({ groupMemberId: z.string().uuid(), value: z.number() })).min(1),
  splitType: z.enum(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]).default("EQUAL"),
  memberIds: z.array(z.string().uuid()).optional(),
  splits: z.array(z.object({ groupMemberId: z.string().uuid(), value: z.number() })).optional(),
});

// PATCH: edit an existing group expense. Replaces its payments/splits wholesale
// and records a single ExpenseHistory entry summarizing what changed, so the
// modal's History tab can show who changed what and when.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; expenseId: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.expense.findFirst({
    where: { id: params.expenseId, groupId: params.id },
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
  const changes = diffExpense(before, after);

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
          summary: changes.join("; "),
        },
      });
    }
    return updated;
  });

  return NextResponse.json({ expense });
}
