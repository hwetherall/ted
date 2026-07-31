"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PunterOption = { id: string; display_name: string };

export function LoginQuiz({ punters, returning = false }: { punters: PunterOption[]; returning?: boolean }) {
  const router = useRouter();
  const [punterId, setPunterId] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function loadOptions() {
    if (!punterId) return;
    setStatus("loading");
    const response = await fetch("/api/auth/punter/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ punterId }),
    });
    const data = await response.json();
    if (response.status === 423) return router.push("/login/locked");
    if (response.status === 409) return router.push("/login/returning");
    if (!response.ok) {
      setStatus("error");
      setMessage(data.error || "Could not load the nicknames. Try again.");
      return;
    }
    setOptions(data.options);
    setStatus("idle");
  }

  async function verify(value: string) {
    setStatus("loading");
    const response = await fetch(returning ? "/api/auth/punter/password" : "/api/auth/punter/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ punterId, nickname: value }),
    });
    if (response.ok) {
      router.push("/trip");
      router.refresh();
      return;
    }
    if (response.status === 423 || response.status === 401) {
      router.push("/login/locked");
      return;
    }
    const data = await response.json();
    setStatus("error");
    setMessage(data.error || "Login did not work. Try again.");
  }

  const chosen = punters.find((punter) => punter.id === punterId)?.display_name;
  const atChallenge = returning ? Boolean(punterId) : options.length > 0;

  return (
    <div>
      {!atChallenge ? (
        <div className="mt-7 grid gap-4">
          <label className="label">Find your name
            <select className="field" value={punterId} onChange={(event) => setPunterId(event.target.value)}>
              <option value="">Choose your name</option>
              {punters.map((punter) => <option key={punter.id} value={punter.id}>{punter.display_name}</option>)}
            </select>
          </label>
          {returning ? (
            <button className="button button-primary" disabled={!punterId} onClick={() => setPunterId((value) => value)}>Continue</button>
          ) : (
            <button className="button button-primary" disabled={!punterId || status === "loading"} onClick={loadOptions}>{status === "loading" ? "Checking the board..." : "That's me"}</button>
          )}
        </div>
      ) : (
        <div className="mt-7">
          <button className="text-sm font-semibold text-[var(--gold-light)]" onClick={() => { setOptions([]); setPunterId(""); }}>Change name</button>
          <p className="mt-5 text-sm text-[var(--chalk-muted)]">Right then, {chosen}.</p>
          {returning ? (
            <form className="mt-4 grid gap-4" onSubmit={(event) => { event.preventDefault(); void verify(nickname); }}>
              <label className="label">Type the nickname Ted gave you
                <input className="field" value={nickname} onChange={(event) => setNickname(event.target.value)} autoComplete="current-password" required />
              </label>
              <button className="button button-primary" disabled={status === "loading"}>{status === "loading" ? "Checking..." : "Enter the trip"}</button>
            </form>
          ) : (
            <div className="mt-4 grid gap-3">
              <p className="text-sm font-semibold">Which nickname did Ted give you?</p>
              {options.map((option) => (
                <button key={option} className="surface-flat min-h-14 px-4 text-left font-bold text-[var(--gold-light)] transition-colors hover:border-[var(--gold)]" disabled={status === "loading"} onClick={() => verify(option)}>{option}</button>
              ))}
              <p className="mt-2 text-xs leading-5 text-[var(--chalk-muted)]">One shot. A wrong pick locks this device for 24 hours.</p>
            </div>
          )}
        </div>
      )}
      {message ? <p className="mt-4 rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/10 p-3 text-sm text-[#ffb0a9]">{message}</p> : null}
    </div>
  );
}
