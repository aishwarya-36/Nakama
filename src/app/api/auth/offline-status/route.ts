import { NextResponse } from "next/server";
import { getAppMode } from "@/lib/appMode";
import { prisma } from "@/lib/db";

export async function GET() {
  if (getAppMode() !== "offline") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await prisma.user.findFirst({ select: { id: true } });
  return NextResponse.json({ hasLocalUser: !!user });
}
