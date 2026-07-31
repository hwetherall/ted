import { redirect } from "next/navigation";
import { getPunterSession } from "@/lib/auth/punter";
import { hasSupabaseConfig } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasSupabaseConfig()) redirect("/login");
  if (await getPunterSession()) redirect("/trip");
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/admin");
  redirect("/login");
}
