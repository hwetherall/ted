export function normalizeHost(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  // x-forwarded-host can be a comma-separated list; use the first
  const first = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("[")) {
    const end = first.indexOf("]");
    if (end !== -1) return first.slice(0, end + 1);
  }
  return first.split(":")[0] ?? "";
}

export function requestHost(headers: {
  get(name: string): string | null;
}): string {
  return normalizeHost(headers.get("x-forwarded-host") ?? headers.get("host"));
}

export function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function readHostEnv(primary: string | undefined, publicFallback: string | undefined) {
  const value = (primary ?? publicFallback)?.trim().toLowerCase();
  return value || undefined;
}

export function tedHost(): string | undefined {
  return readHostEnv(process.env.TED_HOST, process.env.NEXT_PUBLIC_TED_HOST);
}

export function crewHost(): string | undefined {
  return readHostEnv(process.env.CREW_HOST, process.env.NEXT_PUBLIC_CREW_HOST);
}

export function hostIsolationEnabled(): boolean {
  return Boolean(tedHost() && crewHost());
}

export function isTedHost(host: string): boolean {
  const expected = tedHost();
  return Boolean(expected && host === expected);
}

/** Explicit crew host, or any non-Ted production host once isolation is configured. */
export function isCrewHost(host: string): boolean {
  if (!hostIsolationEnabled() || isLocalHost(host)) return false;
  if (isTedHost(host)) return false;
  const expected = crewHost();
  if (expected && host === expected) return true;
  // vercel.app aliases and other attached hosts act as crew until cutover
  return true;
}

export function tedTeamSheetPath(token = process.env.TED_INTAKE_TOKEN): string | null {
  if (!token) return null;
  return `/ted/${encodeURIComponent(token)}`;
}

export function isTedPath(pathname: string): boolean {
  return pathname === "/ted" || pathname.startsWith("/ted/");
}

export function isStaticOrInternalPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  // public files with an extension (icons, images, etc.)
  const last = pathname.split("/").pop() ?? "";
  return last.includes(".");
}
