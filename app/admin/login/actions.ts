"use server";

import { redirect } from "next/navigation";
import { allowedGroomsmen } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { text } from "@/lib/forms";

export async function adminLoginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  if (!allowedGroomsmen().includes(email)) redirect("/admin/login?error=not-allowed");
  const supabase = await createServerSupabase();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/admin/auth/callback` },
  });
  if (error) redirect("/admin/login?error=send-failed");
  redirect("/admin/login?sent=1");
}
