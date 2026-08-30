import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { buildPersonalKey } from "@/lib/personalGroups";

const schema = z.object({ email: z.string().email() });

// Retroactively claims an existing guest Contact for a real account: every
// GroupMember currently pointing at this Contact gets reassigned to the
// real User instead (history untouched — expenses/settlements reference
// groupMemberId, never contactId directly), and the now-redundant Contact
// is deleted. See CLAUDE.md's "claimed by a real account later" note.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await prisma.contact.findFirst({ where: { id: params.id, ownerId: session.userId } });
  if (!contact) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return NextResponse.json({ error: "No account exists with that email" }, { status: 404 });
  if (target.id === session.userId) {
    return NextResponse.json({ error: "You can't link to yourself" }, { status: 400 });
  }

  const memberships = await prisma.groupMember.findMany({
    where: { contactId: contact.id },
    include: { group: { include: { members: true } } },
  });

  const personalKeyUpdates: { groupId: string; newKey: string }[] = [];

  for (const m of memberships) {
    const conflict = m.group.members.find((other) => other.userId === target.id);
    if (conflict) {
      return NextResponse.json(
        { error: `${target.name} is already a member of "${m.group.name}"` },
        { status: 409 }
      );
    }

    if (m.group.isPersonal) {
      const others = m.group.members.filter((other) => other.id !== m.id && other.userId !== session.userId);
      const otherContactIds = others.map((o) => o.contactId).filter((v): v is string => !!v);
      const otherUserIds = others.map((o) => o.userId).filter((v): v is string => !!v);
      const newKey = buildPersonalKey(session.userId, otherContactIds, [...otherUserIds, target.id]);

      const collision = await prisma.group.findUnique({ where: { personalKey: newKey } });
      if (collision && collision.id !== m.group.id) {
        return NextResponse.json(
          { error: `You already have a direct history with ${target.name} — can't merge it with this contact yet` },
          { status: 409 }
        );
      }
      personalKeyUpdates.push({ groupId: m.group.id, newKey });
    }
  }

  await prisma.$transaction([
    ...memberships.map((m) =>
      prisma.groupMember.update({
        where: { id: m.id },
        data: { contactId: null, userId: target.id, displayName: target.name },
      })
    ),
    ...personalKeyUpdates.map((u) =>
      prisma.group.update({ where: { id: u.groupId }, data: { personalKey: u.newKey } })
    ),
    prisma.contact.delete({ where: { id: contact.id } }),
  ]);

  return NextResponse.json({ linkedUserId: target.id });
}
