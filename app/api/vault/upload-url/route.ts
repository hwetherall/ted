import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePunter } from "@/lib/auth/punter";
import { MAX_FILE_BYTES } from "@/lib/config";
import { createServiceSupabase } from "@/lib/supabase/service";

const allowed: Record<string, { extension: string; kind: "photo" | "video" }> = {
  "image/jpeg": { extension: "jpg", kind: "photo" }, "image/png": { extension: "png", kind: "photo" }, "image/webp": { extension: "webp", kind: "photo" },
  "video/mp4": { extension: "mp4", kind: "video" }, "video/quicktime": { extension: "mov", kind: "video" }, "video/webm": { extension: "webm", kind: "video" },
};
const input = z.object({ filename: z.string().min(1).max(240), mimeType: z.string(), size: z.number().int().positive().max(MAX_FILE_BYTES), caption: z.string().max(300).nullable().optional(), eraTag: z.string().max(80).nullable().optional(), isAnonymous: z.boolean() });

export async function POST(request: Request) {
  const { claims } = await requirePunter();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !allowed[parsed.data?.mimeType || ""]) return NextResponse.json({ error: "That file type is not allowed." }, { status: 400 });
  const type = allowed[parsed.data.mimeType];
  const storagePath = `${claims.punter_id}/${crypto.randomUUID()}.${type.extension}`;
  const service = createServiceSupabase();
  const { data: rowId, error: reserveError } = await service.rpc("reserve_vault_upload", { p_punter_id: claims.punter_id, p_kind: type.kind, p_storage_path: storagePath, p_mime_type: parsed.data.mimeType, p_size_bytes: parsed.data.size, p_caption: parsed.data.caption || "", p_is_anonymous: parsed.data.isAnonymous, p_era_tag: parsed.data.eraTag || "" });
  if (reserveError || !rowId) return NextResponse.json({ error: reserveError?.message || "Upload allowance could not be reserved." }, { status: 400 });
  const { data, error } = await service.storage.from("vault").createSignedUploadUrl(storagePath);
  if (error || !data) { await service.from("vault_items").delete().eq("id", rowId); return NextResponse.json({ error: "Upload URL could not be created." }, { status: 500 }); }
  return NextResponse.json({ rowId, signedUrl: data.signedUrl });
}
