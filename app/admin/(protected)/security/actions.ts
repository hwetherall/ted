"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { text } from "@/lib/forms";

export async function clearLockoutAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("lockouts").delete().eq("device_id", text(formData, "device_id"));
  revalidatePath("/admin/security");
}
