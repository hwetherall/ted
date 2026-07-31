"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { validTedToken } from "@/lib/auth/ted";
import { createServiceSupabase } from "@/lib/supabase/service";
import { text, nullableText } from "@/lib/forms";

const submission = z.object({
  full_name: z.string().min(2).max(120),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().max(40),
  nickname: z.string().min(1).max(80),
  invite_priority: z.enum(["must", "nice"]),
  note: z.string().max(1000),
});

export async function submitTedNameAction(formData: FormData) {
  const token = text(formData, "token");
  if (!validTedToken(token)) redirect("/not-found");
  const parsed = submission.safeParse({
    full_name: text(formData, "full_name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    nickname: text(formData, "nickname"),
    invite_priority: text(formData, "invite_priority"),
    note: text(formData, "note"),
  });
  if (!parsed.success) redirect(`/ted/${token}?error=check-details`);
  const { error } = await createServiceSupabase().from("ted_submissions").insert({
    ...parsed.data,
    email: nullableText(formData, "email"),
    phone: nullableText(formData, "phone"),
    note: nullableText(formData, "note"),
  });
  if (error) redirect(`/ted/${token}?error=save-failed`);
  redirect(`/ted/${token}?added=1`);
}
