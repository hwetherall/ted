"use client";

import { useState } from "react";

const MAX_FILE = 200 * 1024 * 1024;

async function loadImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Photo could not be read.")); image.src = url; });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function preparePhoto(file: File) {
  let blob: Blob = file;
  let type = file.type;
  const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (heic) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    blob = Array.isArray(converted) ? converted[0] : converted;
    type = "image/jpeg";
  }
  const image = await loadImage(blob);
  const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const outputType = type === "image/png" ? "image/png" : "image/jpeg";
  const cleaned = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Photo could not be prepared.")), outputType, 0.9));
  return new File([cleaned], file.name.replace(/\.hei[cf]$/i, outputType === "image/png" ? ".png" : ".jpg"), { type: outputType });
}

function uploadDirect(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Upload failed."));
    request.onerror = () => reject(new Error("The connection dropped during upload."));
    request.send(file);
  });
}

export function VaultUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "preparing" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus("preparing"); setMessage("Preparing the file and removing photo location data.");
    try {
      const prepared = file.type.startsWith("image/") || /\.hei[cf]$/i.test(file.name) ? await preparePhoto(file) : file;
      if (prepared.size > MAX_FILE) throw new Error("Keep each file under 200MB.");
      const response = await fetch("/api/vault/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: prepared.name, mimeType: prepared.type, size: prepared.size, caption: form.get("caption"), eraTag: form.get("era_tag"), isAnonymous: form.get("is_anonymous") === "on" }) });
      const reservation = await response.json();
      if (!response.ok) throw new Error(reservation.error || "Upload could not start.");
      setStatus("uploading"); setMessage("Uploading directly to the private vault.");
      await uploadDirect(reservation.signedUrl, prepared, setProgress);
      const confirmed = await fetch("/api/vault/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowId: reservation.rowId }) });
      if (!confirmed.ok) throw new Error("The file arrived but could not be confirmed. Message a groomsman.");
      setStatus("done"); setMessage("In the vault. A groomsman will approve it before the crew sees it."); setFile(null); setProgress(100); formElement.reset();
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Upload failed."); }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <label className="surface-flat grid cursor-pointer place-items-center gap-2 border-dashed p-7 text-center"><strong>{file ? file.name : "Choose a photo or video"}</strong><span className="text-xs text-[var(--chalk-muted)]">Up to 200MB. Photos lose GPS metadata before upload.</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.heic,.heif" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="label">Caption<input className="field" name="caption" maxLength={300} /></label><label className="label">Era<input className="field" name="era_tag" maxLength={80} placeholder="School, uni, the London years" /></label></div>
    <label className="surface-flat flex items-center gap-3 p-4"><input type="checkbox" name="is_anonymous" /><span><strong>Post anonymously</strong><span className="mt-1 block text-xs text-[var(--chalk-muted)]">Groomsmen can still trace abuse. The crew cannot see who sent it.</span></span></label>
    {status === "uploading" ? <div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[var(--gold)] transition-[width]" style={{ width: `${progress}%` }} /></div><p className="mono mt-2 text-xs text-[var(--gold-light)]">{progress}%</p></div> : null}
    {message ? <p className={`rounded-xl border p-3 text-sm ${status === "error" ? "border-[var(--signal)]/30 bg-[var(--signal)]/10 text-[#ffb0a9]" : "border-[var(--gold)]/20 bg-[var(--gold)]/10 text-[var(--gold-light)]"}`}>{message}</p> : null}
    <button className="button button-primary justify-self-start" disabled={!file || status === "preparing" || status === "uploading"}>{status === "preparing" ? "Preparing..." : status === "uploading" ? "Uploading..." : "Send to the vault"}</button>
  </form>;
}
