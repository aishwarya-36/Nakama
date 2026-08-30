import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAppMode } from "@/lib/appMode";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  pin: z.string().min(4).max(64),
});

// Creates the single local "You" user for offline mode. Only meaningful
// once, before any local user exists — offline mode never has a signup
// flow beyond this.
export async function POST(req: NextRequest) {
  if (getAppMode() !== "offline") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.user.findFirst({ select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Already set up" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { name, pin } = parsed.data;

  const passwordHash = await hashPassword(pin);
  const user = await prisma.user.create({
    data: { name: name || "You", email: "local@nakama.offline", passwordHash },
  });

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
