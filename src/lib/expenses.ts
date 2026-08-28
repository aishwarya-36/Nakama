import { prisma } from "./db";
import { computeSplitRows, validatePayers, type SplitType } from "./splits";

export interface CreateExpenseInput {
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  notes?: string;
  date?: string;
  splitType: SplitType;
  payers: { id: string; value: number }[]; // real GroupMember ids, already resolved
  memberIds?: string[];
  splits?: { id: string; value: number }[];
  changedBy: string;
  actorUserId: string;
}

export type CreateExpenseResult =
  | { ok: true; expense: Awaited<ReturnType<typeof prisma.expense.create>> }
  | { ok: false; error: string };

export async function createExpense(input: CreateExpenseInput): Promise<CreateExpenseResult> {
  const groupMembers = await prisma.groupMember.findMany({ where: { groupId: input.groupId } });
  const validIds = new Set(groupMembers.map((m) => m.id));
  const allIds = groupMembers.map((m) => m.id);

  const payerResult = validatePayers(input.payers, input.amount, validIds);
  if ("error" in payerResult) return { ok: false, error: payerResult.error };
  const paymentRows = payerResult.map((r) => ({ groupMemberId: r.id, amount: r.amount }));

  const splitResult = computeSplitRows(input.splitType, input.amount, validIds, allIds, input.memberIds, input.splits);
  if ("error" in splitResult) return { ok: false, error: splitResult.error };
  const splitRows = splitResult.map((r) => ({ groupMemberId: r.id, amount: r.amount }));

  const expense = await prisma.expense.create({
    data: {
      groupId: input.groupId,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      category: input.category || null,
      notes: input.notes || null,
      splitType: input.splitType,
      date: input.date ? new Date(input.date) : undefined,
      payments: { create: paymentRows },
      splits: { create: splitRows },
      history: { create: { changedBy: input.changedBy, actorUserId: input.actorUserId, summary: "Created" } },
    },
    include: { splits: true, payments: { include: { groupMember: true } } },
  });

  return { ok: true, expense };
}
