export function normalizeHost(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) return host.slice(0, end + 1);
  }
  return host.split(":")[0] ?? "";
}

export function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function tedHost(): string | undefined {
  const value = process.env.TED_HOST?.trim().toLowerCase();
  return value || undefined;
}

export function crewHost(): string | undefined {
  const value = process.env.CREW_HOST?.trim().toLowerCase();
  return value || undefined;
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
