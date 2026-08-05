import { NextResponse, type NextRequest } from "next/server";
import {
  hostIsolationEnabled,
  isCrewHost,
  isLocalHost,
  isStaticOrInternalPath,
  isTedHost,
  isTedPath,
  normalizeHost,
  tedTeamSheetPath,
} from "@/lib/hosts";

const TED_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404, statusText: "Not Found" });
}

function withTedHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(TED_NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host"));
  const { pathname } = request.nextUrl;

  if (!hostIsolationEnabled() || isLocalHost(host)) {
    return NextResponse.next();
  }

  if (isStaticOrInternalPath(pathname)) {
    return NextResponse.next();
  }

  if (isTedHost(host)) {
    if (pathname === "/") {
      const teamSheetPath = tedTeamSheetPath();
      if (!teamSheetPath) return notFound();
      const url = request.nextUrl.clone();
      url.pathname = teamSheetPath;
      return withTedHeaders(NextResponse.rewrite(url));
    }

    if (isTedPath(pathname)) {
      return withTedHeaders(NextResponse.next());
    }

    return notFound();
  }

  if (isCrewHost(host)) {
    if (isTedPath(pathname)) return notFound();
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
