import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { getPeopleWithBalances, PEOPLE_PAGE_SIZE } from "@/lib/people";

// Lists a page of the user's contacts, optionally name-filtered (case-insensitive),
// with balances converted to the user's base currency.
export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

  const { people, total } = await getPeopleWithBalances(user.id, user.baseCurrency, {
    q,
    skip: (page - 1) * PEOPLE_PAGE_SIZE,
    take: PEOPLE_PAGE_SIZE,
  });
  return NextResponse.json({ people, total, page, pageSize: PEOPLE_PAGE_SIZE, baseCurrency: user.baseCurrency });
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
