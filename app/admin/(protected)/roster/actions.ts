"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { nullableText, text } from "@/lib/forms";

function surnameReference(fullName: string) {
  const surname = fullName.trim().split(/\s+/).at(-1)?.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12) || "MATE";
  return `TED-${surname}-${String(randomInt(0, 10000)).padStart(4, "0")}`;
}

export async function createPunterAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const fullName = text(formData, "full_name");
  if (!fullName || !text(formData, "display_name") || !text(formData, "nickname")) return;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from("punters").insert({
      full_name: fullName,
      display_name: text(formData, "display_name"),
      nickname: text(formData, "nickname"),
      email: nullableText(formData, "email"),
      phone: nullableText(formData, "phone"),
      organiser_note: nullableText(formData, "organiser_note"),
      payment_reference: surnameReference(fullName),
    });
    if (!error) break;
    if (error.code !== "23505") throw new Error(error.message);
  }
  revalidatePath("/admin/roster");
}

export async function updatePunterAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("punters").update({
    full_name: text(formData, "full_name"),
    display_name: text(formData, "display_name"),
    nickname: nullableText(formData, "nickname"),
    email: nullableText(formData, "email"),
    phone: nullableText(formData, "phone"),
    rsvp_status: text(formData, "rsvp_status"),
    organiser_note: nullableText(formData, "organiser_note"),
  }).eq("id", text(formData, "id"));
  revalidatePath("/admin/roster");
}

export async function deletePunterAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("punters").delete().eq("id", text(formData, "id"));
  revalidatePath("/admin/roster");
}
