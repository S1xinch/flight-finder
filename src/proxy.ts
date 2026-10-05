import { NextResponse, type NextRequest } from "next/server";

// CSRF: state-changing API calls must come from this site (Origin host == Host). Session cookie is also SameSite=Lax.
export function proxy(req: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    let ok = false;
    try {
      ok = !!origin && new URL(origin).host === req.headers.get("host");
    } catch {}
    if (!ok) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
