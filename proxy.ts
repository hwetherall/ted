import { NextResponse, type NextRequest } from "next/server";
import {
  hostIsolationEnabled,
  isCrewHost,
  isLocalHost,
  isStaticOrInternalPath,
  isTedHost,
  isTedPath,
  requestHost,
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

function rewriteToTeamSheet(request: NextRequest): NextResponse {
  const teamSheetPath = tedTeamSheetPath();
  if (!teamSheetPath) return notFound();
  const url = request.nextUrl.clone();
  url.pathname = teamSheetPath;
  return withTedHeaders(NextResponse.rewrite(url));
}

export function proxy(request: NextRequest) {
  const host = requestHost(request.headers);
  const { pathname } = request.nextUrl;

  if (!hostIsolationEnabled() || isLocalHost(host)) {
    return NextResponse.next();
  }

  if (isStaticOrInternalPath(pathname)) {
    return NextResponse.next();
  }

  if (isTedHost(host)) {
    if (isTedPath(pathname)) {
      return withTedHeaders(NextResponse.next());
    }

    // Ted should never see /login or crew routes. Send everything to the team sheet.
    // Canonicalise odd paths (like /login) to / in the address bar.
    if (pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return withTedHeaders(NextResponse.redirect(url));
    }

    return rewriteToTeamSheet(request);
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
