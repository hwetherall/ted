import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const service = createServiceSupabase(); const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: stale } = await service.from("vault_items").select("id,storage_path").is("upload_confirmed_at", null).lt("created_at", cutoff).not("storage_path", "is", null);
  const paths = (stale || []).map((item) => item.storage_path).filter(Boolean);
  if (paths.length) await service.storage.from("vault").remove(paths);
  if (stale?.length) await service.from("vault_items").delete().in("id", stale.map((item) => item.id));
  return NextResponse.json({ removed: stale?.length || 0 });
}
