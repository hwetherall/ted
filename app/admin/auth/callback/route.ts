import { NextResponse } from "next/server";
import { allowedGroomsmen } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/admin/login?error=invalid-link", url));

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const email = data.user?.email?.toLowerCase();
  const allowed = allowedGroomsmen();
  if (error || !data.user || !email || !allowed.includes(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=not-allowed", url));
  }

  const name = data.user.user_metadata?.name || email.split("@")[0].replace(/[._-]+/g, " ");
  await createServiceSupabase().from("groomsmen").upsert({
    id: data.user.id,
    email,
    name,
    is_treasurer: allowed[0] === email,
  }, { onConflict: "id" });

  return NextResponse.redirect(new URL("/admin", url));
}
