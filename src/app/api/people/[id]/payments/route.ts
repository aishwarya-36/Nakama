import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { findOrCreatePersonalGroup } from "@/lib/personalGroups";

const schema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  note: z.string().optional(),
  direction: z.enum(["youPaidThem", "theyPaidYou"]),
  groupId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!contact) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { amount, currency, note, direction, groupId } = parsed.data;

  let resolvedGroupId: string;
  let myMemberId: string;
  let contactMemberId: string;

  if (groupId) {
    const [myMember, contactMember] = await Promise.all([
      prisma.groupMember.findFirst({ where: { groupId, userId: me.id } }),
      prisma.groupMember.findFirst({ where: { groupId, contactId: contact.id } }),
    ]);
    if (!myMember || !contactMember) {
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    }
    resolvedGroupId = groupId;
    myMemberId = myMember.id;
    contactMemberId = contactMember.id;
  } else {
    const group = await findOrCreatePersonalGroup(me.id, me.name, [contact.id]);
    const myMember = group.members.find((m) => m.userId === me.id);
    const contactMember = group.members.find((m) => m.contactId === contact.id);
    if (!myMember || !contactMember) {
      return NextResponse.json({ error: "Couldn't resolve the direct relationship" }, { status: 400 });
    }
    resolvedGroupId = group.id;
    myMemberId = myMember.id;
    contactMemberId = contactMember.id;
  }

  const [fromMemberId, toMemberId] =
    direction === "youPaidThem" ? [myMemberId, contactMemberId] : [contactMemberId, myMemberId];

  const settlement = await prisma.settlement.create({
    data: {
      groupId: resolvedGroupId,
      fromMemberId,
      toMemberId,
      amount,
      currency,
      note: note || null,
      recordedById: session.userId,
    },
  });
  return NextResponse.json({ settlement });
}
