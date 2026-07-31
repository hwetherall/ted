"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { checkbox, nullableText, text } from "@/lib/forms";
import { dollarsToCents } from "@/lib/money";

export async function addCostAction(formData: FormData) {
  const { supabase, groomsman } = await requireAdmin();
  const { error } = await supabase.from("costs").insert({
    label: text(formData, "label"),
    amount_cents: dollarsToCents(text(formData, "amount")),
    cost_type: text(formData, "cost_type"),
    is_confirmed: checkbox(formData, "is_confirmed"),
    paid_by: checkbox(formData, "paid_by_me") ? groomsman.id : null,
    notes: nullableText(formData, "notes"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/costs");
  revalidatePath("/admin/ledger");
}

export async function updateCostAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("costs").update({
    label: text(formData, "label"),
    amount_cents: dollarsToCents(text(formData, "amount")),
    cost_type: text(formData, "cost_type"),
    is_confirmed: checkbox(formData, "is_confirmed"),
    notes: nullableText(formData, "notes"),
  }).eq("id", text(formData, "id"));
  revalidatePath("/admin/costs");
}

export async function deleteCostAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("costs").delete().eq("id", text(formData, "id"));
  revalidatePath("/admin/costs");
}
