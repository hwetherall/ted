import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePunter } from "@/lib/auth/punter";
import { createServiceSupabase } from "@/lib/supabase/service";

const input = z.object({ rowId: z.uuid() });

export async function POST(request: Request) {
  const { claims } = await requirePunter(); const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  const service = createServiceSupabase();
  const { data: item } = await service.from("vault_items").select("storage_path").eq("id", parsed.data.rowId).eq("submitted_by", claims.punter_id).is("upload_confirmed_at", null).maybeSingle();
  if (!item?.storage_path) return NextResponse.json({ error: "Upload reservation was not found." }, { status: 404 });
  const parts = item.storage_path.split("/"); const filename = parts.pop() || ""; const directory = parts.join("/");
  const { data: objects } = await service.storage.from("vault").list(directory, { search: filename, limit: 2 });
  if (!objects?.some((object) => object.name === filename)) return NextResponse.json({ error: "File has not arrived yet." }, { status: 409 });
  await service.from("vault_items").update({ upload_confirmed_at: new Date().toISOString() }).eq("id", parsed.data.rowId).eq("submitted_by", claims.punter_id);
  return NextResponse.json({ ok: true });
}
