import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getPeopleWithBalances } from "@/lib/people";

// Lists every person (contact) the current user has ever added, across all
// groups (and direct, no-group expenses), with their balance converted to
// the user's base currency.
export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const people = await getPeopleWithBalances(user.id, user.baseCurrency);
  return NextResponse.json({ people, baseCurrency: user.baseCurrency });
}

const schema = z.object({
  name: z.string().min(1),
  baseCurrency: z.string().length(3).optional(),
});

// Adds a person directly, with no group attached yet — they only end up in a
// group (implicit or real) once an expense is actually shared with them.
export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      ownerId: session.userId,
      name: parsed.data.name,
      baseCurrency: parsed.data.baseCurrency || "USD",
    },
  });
  return NextResponse.json({ contact }, { status: 201 });
}
