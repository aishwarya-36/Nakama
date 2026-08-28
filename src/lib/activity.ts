import { prisma } from "./db";

export type ActivityType = "group_created" | "expense" | "settlement";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  summary: string;
  detail?: string;
  groupName: string | null;
  timestamp: Date;
  href: string;
}

type MemberRef = { userId: string | null; contactId: string | null };

// Personal groups have no page of their own — link to the other person instead.
function groupHref(groupId: string, isPersonal: boolean, members: MemberRef[], userId: string): string {
  if (!isPersonal) return `/groups/${groupId}`;
  const other = members.find((m) => m.userId !== userId && m.contactId);
  return other?.contactId ? `/people/${other.contactId}` : `/groups/${groupId}`;
}

// Combines groups/expenses/settlements into one feed, newest first.
export async function getUserActivity(
  userId: string,
  opts: { page?: number; pageSize?: number } = {}
): Promise<{ items: ActivityItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;

  const [groups, historyEntries, settlements] = await Promise.all([
    prisma.group.findMany({
      where: { createdById: userId, isPersonal: false },
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.expenseHistory.findMany({
      where: { actorUserId: userId },
      include: {
        expense: {
          select: {
            description: true,
            group: {
              select: {
                id: true,
                name: true,
                isPersonal: true,
                members: { select: { userId: true, contactId: true } },
              },
            },
          },
        },
      },
    }),
    prisma.settlement.findMany({
      where: { recordedById: userId },
      include: {
        group: {
          select: { id: true, name: true, isPersonal: true, members: { select: { userId: true, contactId: true } } },
        },
        fromMember: { select: { displayName: true } },
        toMember: { select: { displayName: true } },
      },
    }),
  ]);

  const items: ActivityItem[] = [
    ...groups.map((g) => ({
      id: `group:${g.id}`,
      type: "group_created" as const,
      summary: `Created group "${g.name}"`,
      groupName: g.name,
      timestamp: g.createdAt,
      href: `/groups/${g.id}`,
    })),
    ...historyEntries.map((h) => ({
      id: `history:${h.id}`,
      type: "expense" as const,
      summary: h.summary === "Created" ? `Added expense "${h.expense.description}"` : h.summary,
      detail: h.summary === "Created" ? undefined : h.expense.description,
      groupName: h.expense.group.isPersonal ? "Direct expense" : h.expense.group.name,
      timestamp: h.createdAt,
      href: groupHref(h.expense.group.id, h.expense.group.isPersonal, h.expense.group.members, userId),
    })),
    ...settlements.map((s) => ({
      id: `settlement:${s.id}`,
      type: "settlement" as const,
      summary: `Recorded payment: ${s.fromMember.displayName} → ${s.toMember.displayName} ${Number(s.amount).toFixed(2)} ${s.currency}`,
      groupName: s.group.name,
      timestamp: s.date,
      href: groupHref(s.group.id, s.group.isPersonal, s.group.members, userId),
    })),
  ];

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const total = items.length;
  const paged = items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return { items: paged, total, page, pageSize };
}
