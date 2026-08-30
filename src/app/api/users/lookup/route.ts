import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

// Live preview check for the "Link" button on PersonForm — does a real
// account exist at this email? Never returns your own account as a match,
// since you can't link to yourself either way.
export async function GET(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ exists: false });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.id === session.userId) {
    return NextResponse.json({ exists: false });
  }
  return NextResponse.json({ exists: true, name: user.name });
}
