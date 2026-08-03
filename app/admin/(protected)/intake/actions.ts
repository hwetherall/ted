"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { nullableText, text } from "@/lib/forms";

const teamSheetEntry = z.object({
  full_name: z.string().min(2).max(120),
  nickname: z.string().min(1).max(80),
  email: z.union([z.email().max(320), z.literal("")]),
  phone: z.string().max(40),
  note: z.string().max(1000),
});

export async function importSubmissionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("import_ted_submission", { p_submission_id: text(formData, "id") });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/intake");
  revalidatePath("/admin/roster");
}

export async function updateTeamSheetEntryAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = teamSheetEntry.safeParse({
    full_name: text(formData, "full_name"),
    nickname: text(formData, "nickname"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    note: text(formData, "note"),
  });
  if (!parsed.success) return;

  const { error } = await supabase.from("ted_submissions").update({
    full_name: parsed.data.full_name,
    nickname: parsed.data.nickname,
    email: nullableText(formData, "email"),
    phone: nullableText(formData, "phone"),
    note: nullableText(formData, "note"),
  }).eq("id", text(formData, "id")).eq("status", "new");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/intake");
}

export async function removeMistakenEntryAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("ted_submissions")
    .update({ status: "discarded" })
    .eq("id", text(formData, "id"))
    .eq("status", "new");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/intake");
}
