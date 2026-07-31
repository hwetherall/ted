import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";

const previewInput = z.object({
  action: z.literal("preview"), filename: z.string().min(1).max(200), fileFingerprint: z.string().length(64),
  headers: z.array(z.string()).min(1).max(100), mapping: z.object({ date: z.string(), amount: z.string(), description: z.string() }),
  rows: z.array(z.record(z.string(), z.string())).max(1000),
});
const confirmInput = z.object({ action: z.literal("confirm"), rowIds: z.array(z.uuid()).max(1000) });

function parseAmount(value: string) {
  const cleaned = value.replace(/[,$\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { supabase, groomsman } = await requireAdmin();
  if (body?.action === "confirm") {
    const parsed = confirmInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Choose valid matches." }, { status: 400 });
    const { data: confirmed, error } = await supabase.rpc("confirm_bank_import_rows", { p_row_ids: parsed.data.rowIds });
    if (error) return NextResponse.json({ error: "Matched payments could not be recorded." }, { status: 500 });
    return NextResponse.json({ confirmed: confirmed || 0 });
  }

  const parsed = previewInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the file and column mapping." }, { status: 400 });
  const input = parsed.data;
  const { data: existing } = await supabase.from("bank_import_batches").select("id").eq("file_fingerprint", input.fileFingerprint).maybeSingle();
  if (existing) return NextResponse.json({ error: "This exact file was already imported." }, { status: 409 });
  const { data: punters } = await supabase.from("punters").select("id,display_name,payment_reference");
  const { data: batch, error: batchError } = await supabase.from("bank_import_batches").insert({ filename: input.filename, file_fingerprint: input.fileFingerprint, imported_by: groomsman.id }).select("id").single();
  if (batchError || !batch) return NextResponse.json({ error: "The import batch could not be created." }, { status: 500 });
  const headerSignature = createHash("sha256").update(input.headers.join("|")).digest("hex");
  await supabase.from("bank_import_profiles").upsert({ groomsman_id: groomsman.id, header_signature: headerSignature, mapping: input.mapping }, { onConflict: "groomsman_id,header_signature" });
  const prepared = input.rows.map((source) => {
    const description = String(source[input.mapping.description] || "").trim();
    const amountCents = parseAmount(String(source[input.mapping.amount] || ""));
    const dateValue = String(source[input.mapping.date] || "").trim();
    const referenceMatches = (punters || []).filter((punter) => description.toUpperCase().includes(punter.payment_reference));
    const fingerprint = createHash("sha256").update(`${dateValue}|${amountCents}|${description}`).digest("hex");
    return { batch_id: batch.id, source_fingerprint: fingerprint, transaction_date: /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : null, amount_cents: Math.abs(amountCents), description, extracted_reference: referenceMatches.length === 1 ? referenceMatches[0].payment_reference : null, matched_punter_id: referenceMatches.length === 1 ? referenceMatches[0].id : null, status: referenceMatches.length === 1 ? "matched" : referenceMatches.length > 1 ? "ambiguous" : "unmatched" };
  }).filter((row) => row.amount_cents > 0 && row.description);
  const output = [];
  for (const row of prepared) {
    const { data, error } = await supabase.from("bank_import_rows").insert(row).select("id").single();
    const punter = (punters || []).find((item) => item.id === row.matched_punter_id);
    output.push({ id: data?.id || row.source_fingerprint, date: row.transaction_date, description: row.description, amountCents: row.amount_cents, displayName: punter?.display_name || null, reference: row.extracted_reference, status: error?.code === "23505" ? "duplicate" : row.status });
  }
  return NextResponse.json({ rows: output, matched: output.filter((row) => row.status === "matched").length, unmatched: output.filter((row) => row.status !== "matched").length });
}
