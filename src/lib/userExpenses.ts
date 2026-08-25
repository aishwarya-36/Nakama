import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const EXPENSE_RANGES = ["week", "month", "3months", "6months", "year"] as const;
export type ExpenseRange = (typeof EXPENSE_RANGES)[number];

export function rangeToFrom(range: ExpenseRange | undefined, now = new Date()): Date | undefined {
  if (!range) return undefined;
  const from = new Date(now);
  switch (range) {
    case "week":
      from.setDate(from.getDate() - 7);
      break;
    case "month":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3months":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6months":
      from.setMonth(from.getMonth() - 6);
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  return from;
}

export interface UserExpenseRow {
  id: string;
  description: string;
  date: Date;
  amount: number;
  currency: string;
  groupId: string;
  groupName: string;
  isPersonal: boolean;
  paidByName: string;
  yourShare: number;
}

async function buildWhere(userId: string, from?: Date, to?: Date): Promise<Prisma.ExpenseWhereInput> {
  const memberIds = (await prisma.groupMember.findMany({ where: { userId }, select: { id: true } })).map(
    (m) => m.id
  );
  return {
    splits: { some: { groupMemberId: { in: memberIds } } },
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
}

function toRow(e: any): UserExpenseRow {
  return {
    id: e.id,
    description: e.description,
    date: e.date,
    amount: Number(e.amount),
    currency: e.currency,
    groupId: e.groupId,
    groupName: e.group.isPersonal ? "Direct" : e.group.name,
    isPersonal: e.group.isPersonal,
    paidByName: e.paidBy.displayName,
    yourShare: e.splits.reduce((sum: number, s: any) => sum + Number(s.amount), 0),
  };
}

/** Paginated page of the user's expenses across every group (real + direct), newest first. */
export async function getUserExpensesPage(
  userId: string,
  opts: { from?: Date; to?: Date; page?: number; pageSize?: number }
): Promise<{ rows: UserExpenseRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const where = await buildWhere(userId, opts.from, opts.to);

  const memberIds = (await prisma.groupMember.findMany({ where: { userId }, select: { id: true } })).map(
    (m) => m.id
  );

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        paidBy: true,
        group: { select: { name: true, isPersonal: true } },
        splits: { where: { groupMemberId: { in: memberIds } } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { rows: expenses.map((e) => toRow(e)), total, page, pageSize };
}

/** Every matching expense (no pagination) — for export. */
export async function getAllUserExpenses(userId: string, from?: Date, to?: Date): Promise<UserExpenseRow[]> {
  const where = await buildWhere(userId, from, to);
  const memberIds = (await prisma.groupMember.findMany({ where: { userId }, select: { id: true } })).map(
    (m) => m.id
  );
  const expenses = await prisma.expense.findMany({
    where,
    include: {
      paidBy: true,
      group: { select: { name: true, isPersonal: true } },
      splits: { where: { groupMemberId: { in: memberIds } } },
    },
    orderBy: { date: "desc" },
  });
  return expenses.map((e) => toRow(e));
}
