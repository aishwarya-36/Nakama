import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAppMode } from "@/lib/appMode";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({ pin: z.string().min(1) });

export async function POST(req: NextRequest) {
  if (getAppMode() !== "offline") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 400 });
  }

  const user = await prisma.user.findFirst();
  if (!user || !(await verifyPassword(parsed.data.pin, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const token = signSession({ userId: user.id, email: user.email });
  const res = NextResponse.json({ id: user.id, name: user.name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
