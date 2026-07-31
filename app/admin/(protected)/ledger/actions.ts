"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { nullableText, text } from "@/lib/forms";
import { dollarsToCents } from "@/lib/money";

export async function recordPaymentAction(formData: FormData) {
  const { supabase, groomsman } = await requireAdmin();
  const received = text(formData, "received_at");
  const { error } = await supabase.from("payments").insert({
    punter_id: text(formData, "punter_id"),
    amount_cents: dollarsToCents(text(formData, "amount")),
    method: text(formData, "method"),
    received_at: received ? new Date(`${received}T12:00:00Z`).toISOString() : new Date().toISOString(),
    recorded_by: groomsman.id,
    note: nullableText(formData, "note"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ledger");
}
