import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

// Lists the current user's contacts (guest identities they've created before),
// optionally filtered by a name substring, for autocomplete when adding people
// to a group. Includes which groups each contact is already in, so the person
// picking can tell two same-named contacts apart.
export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim() || "";

  const contacts = await prisma.contact.findMany({
    where: {
      ownerId: session.userId,
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    include: {
      groupMembers: { include: { group: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json({
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      baseCurrency: c.baseCurrency,
      groupNames: c.groupMembers.map((gm) => gm.group.name),
    })),
  });
}
