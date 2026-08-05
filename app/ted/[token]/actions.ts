"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { text, nullableText } from "@/lib/forms";
import { toE164 } from "@/lib/phone";
import { addTedTeamSheetEntry, isPartyRole, updateTedTeamSheetEntry } from "@/lib/ted/team-sheet";

const submission = z.object({
  full_name: z.string().min(2).max(120),
  email: z.union([z.email().max(320), z.literal("")]),
  phone: z.string().max(20),
  nickname: z.string().min(1).max(80),
  note: z.string().max(1000),
  party_role: z.enum(["guest", "groomsman"]),
});

export type TeamSheetActionState = {
  status: "idle" | "success" | "error";
  message: string;
  savedAt?: number;
};

function entryFrom(formData: FormData) {
  const phone = toE164(text(formData, "country_code"), text(formData, "phone")) ?? "";
  const partyRole = text(formData, "party_role");
  if (!isPartyRole(partyRole)) return null;

  const parsed = submission.safeParse({
    full_name: text(formData, "full_name"),
    email: text(formData, "email"),
    phone,
    nickname: text(formData, "nickname"),
    note: text(formData, "note"),
    party_role: partyRole,
  });

  if (!parsed.success) return null;

  return {
    ...parsed.data,
    email: nullableText(formData, "email"),
    phone: phone || null,
    note: nullableText(formData, "note"),
  };
}

export async function submitTedNameAction(
  _previousState: TeamSheetActionState,
  formData: FormData,
): Promise<TeamSheetActionState> {
  const token = text(formData, "token");
  const entry = entryFrom(formData);
  if (!entry) return { status: "error", message: "Check the details and try again." };

  const result = await addTedTeamSheetEntry(token, entry);
  if (!result.authorized) notFound();
  if (result.error) return { status: "error", message: "That person was not saved. Try again." };

  revalidatePath(`/ted/${token}`);
  return { status: "success", message: "Locked in. Who's next?", savedAt: Date.now() };
}

export async function updateTedNameAction(
  _previousState: TeamSheetActionState,
  formData: FormData,
): Promise<TeamSheetActionState> {
  const token = text(formData, "token");
  const id = text(formData, "id");
  const entry = entryFrom(formData);
  if (!z.uuid().safeParse(id).success || !entry) {
    return { status: "error", message: "Check the details and try again." };
  }

  const result = await updateTedTeamSheetEntry(token, id, entry);
  if (!result.authorized) notFound();
  if (result.error) return { status: "error", message: "Those changes were not saved. Try again." };

  revalidatePath(`/ted/${token}`);
  return { status: "success", message: "Details updated.", savedAt: Date.now() };
}
