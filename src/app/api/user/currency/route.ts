import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { CURRENCY_CODES } from "@/lib/currencies";

const schema = z.object({ baseCurrency: z.enum(CURRENCY_CODES as [string, ...string[]]) });

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { baseCurrency: parsed.data.baseCurrency },
  });
  return NextResponse.json({ baseCurrency: updated.baseCurrency });
}
