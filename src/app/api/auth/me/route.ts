import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, baseCurrency: true },
  });
  return NextResponse.json({ user });
}
