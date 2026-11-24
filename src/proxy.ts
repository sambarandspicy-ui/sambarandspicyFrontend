import { NextResponse, type NextRequest } from "next/server";

// The browser talks to this origin; Next.js forwards to the local API.
// Remove the public Origin only for same-origin browser requests, otherwise
// Spring sees the proxy's internal host as a different origin. CSRF validation
// remains enabled on the backend; cross-origin requests retain their Origin.
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();

  const site = request.headers.get("sec-fetch-site");
  let matchesHost = false;
  try {
    matchesHost =
      new URL(origin).host.toLowerCase() ===
      request.headers.get("host")?.toLowerCase();
  } catch {
    return NextResponse.next();
  }

  if (site !== "same-origin" && !(site === null && matchesHost)) {
    return NextResponse.next();
  }
  const headers = new Headers(request.headers);
  headers.delete("origin");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/api/v1/:path*"] };
