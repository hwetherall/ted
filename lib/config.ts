export const EVENT_TZ = process.env.NEXT_PUBLIC_EVENT_TZ || "Australia/Melbourne";
export const EVENT_START = process.env.NEXT_PUBLIC_EVENT_START || "2027-04-10T09:00:00+10:00";
export const PAYID = process.env.NEXT_PUBLIC_PAYID || "Set Harry's PayID";

export const MAX_FILE_BYTES = 200 * 1024 * 1024;
export const MAX_PUNTER_BYTES = 500 * 1024 * 1024;
export const PUNTER_SESSION_DAYS = 90;

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
