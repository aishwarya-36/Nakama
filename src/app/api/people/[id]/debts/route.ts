import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { computePairwiseDebts, type SimplifiedDebt } from "@/lib/balances";

interface DebtWithGroup extends SimplifiedDebt {
  groupId: string;
  groupName: string;
  isPersonal: boolean;
}

interface Context {
  groupId: string;
  groupName: string;
  isPersonal: boolean;
  myMemberId: string;
  contactMemberId: string;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isRealUser = params.id.startsWith("user:");
  const memberWhere = isRealUser
    ? { userId: params.id.slice("user:".length) }
    : { contactId: params.id };

  if (isRealUser) {
    const otherUserId = params.id.slice("user:".length);
    const shared = await prisma.groupMember.findFirst({
      where: { userId: otherUserId, group: { members: { some: { userId: session.userId } } } },
    });
    if (!shared) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  } else {
    const contact = await prisma.contact.findFirst({
      where: { id: params.id, ownerId: session.userId },
    });
    if (!contact) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const contactMemberships = await prisma.groupMember.findMany({
    where: memberWhere,
    include: { group: { select: { id: true, name: true, isPersonal: true } } },
  });

  const debts: DebtWithGroup[] = [];
  const contexts: Context[] = [];

  for (const cm of contactMemberships) {
    const myMember = await prisma.groupMember.findFirst({
      where: { groupId: cm.groupId, userId: session.userId },
    });
    if (!myMember) continue;

    const groupName = cm.group.isPersonal ? "Direct" : cm.group.name;
    contexts.push({
      groupId: cm.groupId,
      groupName,
      isPersonal: cm.group.isPersonal,
      myMemberId: myMember.id,
      contactMemberId: cm.id,
    });

    const pairwise = await computePairwiseDebts(cm.groupId);
    for (const d of pairwise) {
      const isThisPair =
        (d.fromMemberId === myMember.id && d.toMemberId === cm.id) ||
        (d.fromMemberId === cm.id && d.toMemberId === myMember.id);
      if (isThisPair) {
        debts.push({ ...d, groupId: cm.groupId, groupName, isPersonal: cm.group.isPersonal });
      }
    }
  }

  return NextResponse.json({ debts, contexts });
}
