import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import GroupsList from "@/components/GroupsList";
import { GROUPS_PAGE_SIZE } from "@/lib/groups";

export default async function GroupsPage() {
  const session = getSessionFromCookies();
  if (!session) redirect("/login");

  const where = { isPersonal: false, members: { some: { userId: session.userId } } };
  const [total, groups] = await Promise.all([
    prisma.group.count({ where }),
    prisma.group.findMany({
      where,
      include: { members: true, _count: { select: { expenses: true } } },
      orderBy: { createdAt: "desc" },
      take: GROUPS_PAGE_SIZE,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <GroupsList initialGroups={groups} initialTotal={total} />
    </div>
  );
}
