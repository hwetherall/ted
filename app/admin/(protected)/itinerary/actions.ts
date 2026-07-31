"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { checkbox, nullableText, text } from "@/lib/forms";
import { eventInputToUtc } from "@/lib/time";

export async function addItineraryAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("itinerary_items").insert({ title: text(formData, "title"), description: nullableText(formData, "description"), starts_at: eventInputToUtc(text(formData, "starts_at")), ends_at: nullableText(formData, "ends_at") ? eventInputToUtc(text(formData, "ends_at")) : null, location_name: nullableText(formData, "location_name"), address: nullableText(formData, "address"), map_url: nullableText(formData, "map_url"), cost_note: nullableText(formData, "cost_note"), sort_order: Number(text(formData, "sort_order") || 0), is_published: checkbox(formData, "is_published") });
  if (error) throw new Error(error.message); revalidatePath("/admin/itinerary");
}

export async function updateItineraryAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("itinerary_items").update({ title: text(formData, "title"), description: nullableText(formData, "description"), starts_at: eventInputToUtc(text(formData, "starts_at")), ends_at: nullableText(formData, "ends_at") ? eventInputToUtc(text(formData, "ends_at")) : null, location_name: nullableText(formData, "location_name"), address: nullableText(formData, "address"), map_url: nullableText(formData, "map_url"), cost_note: nullableText(formData, "cost_note"), sort_order: Number(text(formData, "sort_order") || 0), is_published: checkbox(formData, "is_published") }).eq("id", text(formData, "id"));
  revalidatePath("/admin/itinerary"); revalidatePath("/trip/itinerary");
}

export async function deleteItineraryAction(formData: FormData) {
  const { supabase } = await requireAdmin(); await supabase.from("itinerary_items").delete().eq("id", text(formData, "id")); revalidatePath("/admin/itinerary");
}
