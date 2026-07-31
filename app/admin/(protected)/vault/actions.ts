"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { checkbox, text } from "@/lib/forms";

export async function moderateVaultAction(formData: FormData) {
  const { supabase } = await requireAdmin(); await supabase.from("vault_items").update({ moderation_status: text(formData, "status"), cleared_for_slideshow: checkbox(formData, "cleared_for_slideshow") }).eq("id", text(formData, "id")); revalidatePath("/admin/vault"); revalidatePath("/trip/vault");
}
