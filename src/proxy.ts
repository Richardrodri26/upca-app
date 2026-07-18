import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Optimistic check only — does NOT validate the session.
// Real auth validation lives in (dashboard)/layout.tsx and (auth)/layout.tsx.
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isAuthPath = pathname === "/sign-in" || pathname === "/sign-up";
  const isApiPath = pathname.startsWith("/api/");

  if (!sessionCookie && !isAuthPath && !isApiPath) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/sign-in",
    "/sign-up",
    "/positions/:path*",
    "/evaluations/:path*",
    "/manuals/:path*",
    "/knowledge-base/:path*",
    "/my-evaluations/:path*",
    "/my-results/:path*",
    "/users/:path*",
    "/unauthorized",
  ],
};
