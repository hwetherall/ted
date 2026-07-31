"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { text } from "@/lib/forms";

export async function importSubmissionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("import_ted_submission", { p_submission_id: text(formData, "id") });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/intake");
  revalidatePath("/admin/roster");
}

export async function discardSubmissionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("ted_submissions").update({ status: "discarded" }).eq("id", text(formData, "id"));
  revalidatePath("/admin/intake");
}
