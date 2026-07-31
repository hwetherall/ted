"use client";

import Papa from "papaparse";
import { useMemo, useState } from "react";

type PreviewRow = { id: string; date: string | null; description: string; amountCents: number; displayName: string | null; reference: string | null; status: string };

export function CsvImporter() {
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState({ date: "", amount: "", description: "" });
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mapped = mapping.date && mapping.amount && mapping.description;
  const matchedIds = useMemo(() => preview.filter((row) => row.status === "matched").map((row) => row.id), [preview]);

  async function chooseFile(file: File) {
    if (file.size > 1_000_000) { setMessage("Keep bank CSV files under 1MB."); return; }
    const source = await file.text();
    const parsed = Papa.parse<Record<string, string>>(source, { header: true, skipEmptyLines: true });
    const fields = parsed.meta.fields || [];
    setFilename(file.name); setHeaders(fields); setRows(parsed.data.slice(0, 1000)); setPreview([]); setMessage("");
    const guess = (patterns: RegExp[]) => fields.find((field) => patterns.some((pattern) => pattern.test(field))) || "";
    setMapping({ date: guess([/date/i]), amount: guess([/amount/i, /credit/i]), description: guess([/description/i, /details/i, /narrative/i, /reference/i]) });
  }

  async function createPreview() {
    setBusy(true); setMessage("");
    const source = JSON.stringify({ filename, headers, mapping, rows });
    const fingerprint = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    const fileFingerprint = Array.from(new Uint8Array(fingerprint)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const response = await fetch("/api/admin/ledger/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "preview", filename, fileFingerprint, headers, mapping, rows }) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(data.error || "The file could not be prepared."); return; }
    setPreview(data.rows); setMessage(`${data.matched} matched, ${data.unmatched} need attention.`);
  }

  async function confirm() {
    setBusy(true);
    const response = await fetch("/api/admin/ledger/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "confirm", rowIds: matchedIds }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(data.error || "Payments were not recorded."); return; }
    setMessage(`${data.confirmed} payments recorded.`); setPreview((current) => current.map((row) => matchedIds.includes(row.id) ? { ...row, status: "confirmed" } : row));
  }

  return <div className="grid gap-6">
    <label className="surface-flat grid cursor-pointer place-items-center gap-2 border-dashed p-8 text-center"><strong>Choose bank CSV</strong><span className="text-sm text-[var(--chalk-muted)]">Nothing is recorded until you confirm the matches.</span><input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void chooseFile(event.target.files[0])} /></label>
    {headers.length ? <section className="surface-flat p-5"><h2 className="display text-xl">Map the columns</h2><p className="mt-1 text-sm text-[var(--chalk-muted)]">{filename}, {rows.length} rows</p><div className="mt-4 grid gap-4 sm:grid-cols-3">{(["date", "amount", "description"] as const).map((key) => <label key={key} className="label capitalize">{key}<select className="field" value={mapping[key]} onChange={(event) => setMapping({ ...mapping, [key]: event.target.value })}><option value="">Choose column</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div><button className="button button-primary mt-5" disabled={!mapped || busy} onClick={createPreview}>{busy ? "Preparing..." : "Propose matches"}</button></section> : null}
    {message ? <p className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/10 p-4 text-sm text-[var(--gold-light)]">{message}</p> : null}
    {preview.length ? <><div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Match</th><th>Status</th></tr></thead><tbody>{preview.map((row) => <tr key={row.id}><td>{row.date || "Unknown"}</td><td className="max-w-sm">{row.description}</td><td className="mono">${(row.amountCents / 100).toFixed(2)}</td><td>{row.displayName || row.reference || "No match"}</td><td>{row.status}</td></tr>)}</tbody></table></div><button className="button button-primary justify-self-start" disabled={!matchedIds.length || busy} onClick={confirm}>Confirm {matchedIds.length} matched payments</button></> : null}
  </div>;
}
