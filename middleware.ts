import { NextResponse, type NextRequest } from "next/server";

import { GATE_COOKIE_NAME, verifyGateCookie } from "@/lib/gate";

// Paths the middleware lets through unauthenticated. Static assets are
// already excluded by the matcher below; this list is for app routes the
// gate itself relies on.
const PUBLIC_PATHS = new Set<string>(["/gate"]);

// The admin section uses its own gate (lib/admin-gate). The office gate
// is a separate concern and should not block admin access — the admin
// layout enforces the admin cookie, and admin API routes call
// `authForAdmin()`. Both `/admin/*` page routes and `/api/admin/*` API
// routes skip this middleware entirely.
function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (isAdminPath(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(GATE_COOKIE_NAME)?.value;
  const payload = cookie ? await verifyGateCookie(cookie) : null;

  if (payload) return NextResponse.next();

  // API routes get a JSON 401 — easier for clients to handle than a redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "gate_required" }, { status: 401 });
  }

  // Page routes redirect to /gate, preserving the original URL so the gate
  // form can bounce the user back after a successful unlock.
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = "";
  url.searchParams.set("next", pathname + (search ?? ""));
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals and common static files. Everything else flows
  // through the middleware and is gated unless explicitly public.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
