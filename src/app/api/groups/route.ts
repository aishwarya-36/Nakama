import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { resolveContact } from "@/lib/contacts";

// GET: list groups the current user belongs to.
export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: { isPersonal: false, members: { some: { userId: session.userId } } },
    include: { members: true, _count: { select: { expenses: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ groups });
}

const personSchema = z.object({
  name: z.string().min(1),
  contactId: z.string().uuid().optional(),
  baseCurrency: z.string().length(3).optional(),
});

const schema = z.object({
  name: z.string().min(1),
  members: z.array(personSchema).default([]),
});

// POST: create a group. You just type member names (or pick an existing contact) —
// no accounts required. The creator is added automatically, linked to their own account.
export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, members } = parsed.data;

  const me = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guestData: { displayName: string; contactId: string }[] = [];
  for (const person of members) {
    if (!person.name.trim()) continue;
    try {
      const contact = await resolveContact(me.id, person);
      guestData.push({ displayName: contact.name, contactId: contact.id });
    } catch {
      return NextResponse.json({ error: "One of the selected people is invalid" }, { status: 400 });
    }
  }

  const group = await prisma.group.create({
    data: {
      name,
      members: {
        create: [
          { displayName: me.name, userId: me.id },
          ...guestData,
        ],
      },
    },
    include: { members: true },
  });

  return NextResponse.json({ group }, { status: 201 });
}
