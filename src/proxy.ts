import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/adminAuth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page is always reachable — do not protect it.
  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const valid = await isValidAdminToken(token);

  if (!valid) {
    // Write-capable API routes return 401 JSON.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          ok: false,
          status: "unauthorized",
          message: "Admin access is required.",
        },
        { status: 401 }
      );
    }
    // Admin pages redirect to the login gate.
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/generate-episode-package",
    "/api/github/save-episode",
    "/api/github/mark-episode-public-ready",
  ],
};
