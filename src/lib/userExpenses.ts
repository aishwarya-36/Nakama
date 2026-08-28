import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const EXPENSE_RANGES = ["week", "month", "3months", "6months", "year"] as const;
export type ExpenseRange = (typeof EXPENSE_RANGES)[number];

export const EXPENSE_SCOPES = ["mine", "group"] as const;
export type ExpenseScope = (typeof EXPENSE_SCOPES)[number];

export const EXPENSE_OWE_FILTERS = ["owe", "owed"] as const;
export type ExpenseOweFilter = (typeof EXPENSE_OWE_FILTERS)[number];

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
  category: string | null;
  notes: string | null;
  groupId: string;
  groupName: string;
  isPersonal: boolean;
  isMine: boolean;
  paidByName: string;
  yourShare: number;
  yourPaid: number;
  yourNet: number; // yourPaid - yourShare: positive = you're owed, negative = you owe
}

function paidByLabel(payments: { groupMember: { displayName: string } }[]): string {
  if (payments.length === 0) return "—";
  if (payments.length === 1) return payments[0].groupMember.displayName;
  return `${payments[0].groupMember.displayName} +${payments.length - 1}`;
}

async function buildWhere(
  userId: string,
  from?: Date,
  to?: Date,
  q?: string,
  scope?: ExpenseScope
): Promise<Prisma.ExpenseWhereInput> {
  const memberIds = (await prisma.groupMember.findMany({ where: { userId }, select: { id: true } })).map(
    (m) => m.id
  );
  const soloKey = `solo:${userId}`;
  return {
    splits: { some: { groupMemberId: { in: memberIds } } },
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? { description: { contains: q, mode: "insensitive" } } : {}),
    ...(scope === "mine"
      ? { group: { personalKey: soloKey } }
      : scope === "group"
        ? { NOT: { group: { personalKey: soloKey } } }
        : {}),
  };
}

function toRow(e: any, userId: string, memberIds: string[]): UserExpenseRow {
  const isMine = e.group.isPersonal && e.group.personalKey === `solo:${userId}`;
  const yourShare = e.splits.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const yourPaid = e.payments
    .filter((p: any) => memberIds.includes(p.groupMemberId))
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  return {
    id: e.id,
    description: e.description,
    date: e.date,
    amount: Number(e.amount),
    currency: e.currency,
    category: e.category,
    notes: e.notes,
    groupId: e.groupId,
    groupName: isMine ? "Personal" : e.group.isPersonal ? "Direct" : e.group.name,
    isPersonal: e.group.isPersonal,
    isMine,
    paidByName: paidByLabel(e.payments),
    yourShare,
    yourPaid,
    yourNet: yourPaid - yourShare,
  };
}

function applyOweFilter(rows: UserExpenseRow[], owe?: ExpenseOweFilter): UserExpenseRow[] {
  if (owe === "owe") return rows.filter((r) => r.yourNet < -0.005);
  if (owe === "owed") return rows.filter((r) => r.yourNet > 0.005);
  return rows;
}

/** Paginated page of the user's expenses across every group (real + direct), newest first. */
export async function getUserExpensesPage(
  userId: string,
  opts: {
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
    q?: string;
    scope?: ExpenseScope;
    owe?: ExpenseOweFilter;
  }
): Promise<{ rows: UserExpenseRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const where = await buildWhere(userId, opts.from, opts.to, opts.q, opts.scope);

  const memberIds = (await prisma.groupMember.findMany({ where: { userId }, select: { id: true } })).map(
    (m) => m.id
  );

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      payments: { include: { groupMember: { select: { displayName: true } } } },
      group: { select: { name: true, isPersonal: true, personalKey: true } },
      splits: { where: { groupMemberId: { in: memberIds } } },
    },
    orderBy: { date: "desc" },
  });

  const rows = applyOweFilter(
    expenses.map((e) => toRow(e, userId, memberIds)),
    opts.owe
  );
  const total = rows.length;
  const paged = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return { rows: paged, total, page, pageSize };
}

/** Every matching expense (no pagination) — for export. */
export async function getAllUserExpenses(
  userId: string,
  from?: Date,
  to?: Date,
  scope?: ExpenseScope,
  owe?: ExpenseOweFilter
): Promise<UserExpenseRow[]> {
  const where = await buildWhere(userId, from, to, undefined, scope);
  const memberIds = (await prisma.groupMember.findMany({ where: { userId }, select: { id: true } })).map(
    (m) => m.id
  );
  const expenses = await prisma.expense.findMany({
    where,
    include: {
      payments: { include: { groupMember: { select: { displayName: true } } } },
      group: { select: { name: true, isPersonal: true, personalKey: true } },
      splits: { where: { groupMemberId: { in: memberIds } } },
    },
    orderBy: { date: "desc" },
  });
  return applyOweFilter(
    expenses.map((e) => toRow(e, userId, memberIds)),
    owe
  );
}
