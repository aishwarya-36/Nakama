import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { resolveContact } from "@/lib/contacts";
import { GROUPS_PAGE_SIZE } from "@/lib/groups";

// GET: list a page of groups the current user belongs to, optionally name-filtered (case-insensitive).
export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

  const where = {
    isPersonal: false,
    members: { some: { userId: session.userId } },
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, groups] = await Promise.all([
    prisma.group.count({ where }),
    prisma.group.findMany({
      where,
      include: { members: true, _count: { select: { expenses: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * GROUPS_PAGE_SIZE,
      take: GROUPS_PAGE_SIZE,
    }),
  ]);
  return NextResponse.json({ groups, total, page, pageSize: GROUPS_PAGE_SIZE });
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

// POST: create a group, adding the creator automatically.
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
      createdById: me.id,
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
