import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (params.id.startsWith("user:")) {
    return NextResponse.json({ error: "Not available for a linked account" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!contact) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  let token = contact.shareToken;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    await prisma.contact.update({ where: { id: contact.id }, data: { shareToken: token } });
  }

  return NextResponse.json({ url: `${req.nextUrl.origin}/share/${token}` });
}
