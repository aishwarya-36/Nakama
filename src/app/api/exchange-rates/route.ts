import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getRates, getLatestSnapshot, refreshRates } from "@/lib/currency";

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await getRates(); // lazily refreshes if we've rolled into a new month
  const snapshot = await getLatestSnapshot();
  return NextResponse.json({ fetchedAt: snapshot?.fetchedAt ?? null });
}

export async function POST() {
  const session = getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snapshot = await refreshRates();
    return NextResponse.json({ fetchedAt: snapshot.fetchedAt });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the exchange rate service" }, { status: 500 });
  }
}
