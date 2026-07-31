"use server";

import { revalidatePath } from "next/cache";
import { requirePunter } from "@/lib/auth/punter";
import { checkbox, nullableText, text } from "@/lib/forms";
import { eventInputToUtc } from "@/lib/time";

export async function saveRsvpAction(formData: FormData) {
  const { claims, supabase } = await requirePunter();
  const arrival = nullableText(formData, "arrival_at");
  const departure = nullableText(formData, "departure_at");
  const { error } = await supabase.from("punters").update({
    rsvp_status: text(formData, "rsvp_status"),
    email: nullableText(formData, "email"),
    phone: nullableText(formData, "phone"),
    arrival_at: arrival ? eventInputToUtc(arrival) : null,
    departure_at: departure ? eventInputToUtc(departure) : null,
    arrival_airport: nullableText(formData, "arrival_airport"),
    dietary_notes: nullableText(formData, "dietary_notes"),
    drinks_alcohol: checkbox(formData, "drinks_alcohol"),
    how_they_know_ted: nullableText(formData, "how_they_know_ted"),
  }).eq("id", claims.punter_id);
  if (error) throw new Error(error.message);
  revalidatePath("/trip");
  revalidatePath("/trip/rsvp");
}
