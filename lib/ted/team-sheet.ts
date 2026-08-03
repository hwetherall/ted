import "server-only";

import { validTedToken } from "@/lib/auth/ted";
import { createServiceSupabase } from "@/lib/supabase/service";

export type TeamSheetEntry = {
  id: string;
  full_name: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  note: string | null;
};

export type TeamSheetEntryInput = Omit<TeamSheetEntry, "id">;

export async function getTedTeamSheet(token: string): Promise<TeamSheetEntry[] | null> {
  if (!validTedToken(token)) return null;

  const { data, error } = await createServiceSupabase()
    .from("ted_submissions")
    .select("id,full_name,nickname,email,phone,note")
    .neq("status", "discarded")
    .order("submitted_at");

  if (error) throw new Error("The team sheet could not be loaded.");

  return data || [];
}

export async function addTedTeamSheetEntry(token: string, entry: TeamSheetEntryInput) {
  if (!validTedToken(token)) return { authorized: false as const, error: null };

  const { error } = await createServiceSupabase()
    .from("ted_submissions")
    .insert(entry);

  return { authorized: true as const, error };
}

export async function updateTedTeamSheetEntry(token: string, id: string, entry: TeamSheetEntryInput) {
  if (!validTedToken(token)) return { authorized: false as const, error: null };

  const { data, error } = await createServiceSupabase()
    .from("ted_submissions")
    .update(entry)
    .eq("id", id)
    .neq("status", "discarded")
    .select("id")
    .maybeSingle();

  return { authorized: true as const, error: error || (!data ? new Error("Entry not found") : null) };
}
