"use server";

import { revalidatePath } from "next/cache";
import { requirePunter } from "@/lib/auth/punter";
import { createServiceSupabase } from "@/lib/supabase/service";
import { checkbox, nullableText } from "@/lib/forms";

export async function submitStoryAction(formData: FormData) {
  const { claims } = await requirePunter(); const story = nullableText(formData, "story_text"); if (!story) return;
  await createServiceSupabase().from("vault_items").insert({ kind: "story", story_text: story, caption: nullableText(formData, "caption"), submitted_by: claims.punter_id, is_anonymous: checkbox(formData, "is_anonymous"), era_tag: nullableText(formData, "era_tag"), upload_confirmed_at: new Date().toISOString() });
  revalidatePath("/trip/vault");
}
