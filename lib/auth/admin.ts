import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export function allowedGroomsmen() {
  return (process.env.GROOMSMEN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !allowedGroomsmen().includes(user.email.toLowerCase())) redirect("/admin/login");

  const { data: groomsman } = await supabase
    .from("groomsmen")
    .select("id,email,name,is_treasurer")
    .eq("id", user.id)
    .maybeSingle();

  if (!groomsman) redirect("/admin/login?error=not-on-roster");
  return { supabase, user, groomsman };
}
