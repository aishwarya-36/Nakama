import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { resolveContact } from "@/lib/contacts";

const schema = z.object({
  name: z.string().min(1),
  contactId: z.string().uuid().optional(),
  baseCurrency: z.string().length(3).optional(),
});

// Adds a new member to a group — either a brand new guest (by name), or an
// existing contact (by contactId) so their history combines across groups.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: params.id, userId: session.userId },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let contact;
  try {
    contact = await resolveContact(session.userId, parsed.data);
  } catch {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
  }

  const existing = await prisma.groupMember.findFirst({
    where: { groupId: params.id, contactId: contact.id },
  });
  if (existing) {
    return NextResponse.json({ error: `${contact.name} is already in this group` }, { status: 409 });
  }

  const member = await prisma.groupMember.create({
    data: { groupId: params.id, displayName: contact.name, contactId: contact.id },
  });
  return NextResponse.json({ member }, { status: 201 });
}
