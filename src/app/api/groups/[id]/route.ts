import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

async function assertMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId } });
  return !!membership;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertMember(params.id, session.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: true,
      expenses: {
        include: { splits: true, paidBy: true },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group });
}
