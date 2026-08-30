import { NextRequest, NextResponse } from "next/server";
import { getAppMode, getAuthPagePath } from "@/lib/appMode";

const PROTECTED_PREFIXES = ["/home", "/groups", "/expenses", "/settings"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const mode = getAppMode();
  const authPagePath = getAuthPagePath();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const token = req.cookies.get("session")?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = authPagePath;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Offline mode has no signup step; online mode has no PIN gate — each
  // mode's auth pages are unreachable under the other.
  const isWrongModeAuthPage =
    (mode === "offline" && (pathname === "/login" || pathname === "/register")) ||
    (mode === "online" && pathname === "/offline-lock");
  if (isWrongModeAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = authPagePath;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/groups/:path*",
    "/expenses/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/offline-lock",
  ],
};
