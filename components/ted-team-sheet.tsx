"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  submitTedNameAction,
  updateTedNameAction,
  type TeamSheetActionState,
} from "@/app/ted/[token]/actions";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  PHONE_COUNTRY_CODES,
  splitE164,
} from "@/lib/phone";
import type { TeamSheetEntry } from "@/lib/ted/team-sheet";

const initialState: TeamSheetActionState = { status: "idle", message: "" };

function PendingButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button className="button button-primary justify-self-start" disabled={isPending}>
      {isPending ? pending : idle}
    </button>
  );
}

function MobileField({ defaultPhone }: { defaultPhone?: string | null }) {
  const { countryCode, nationalNumber } = splitE164(defaultPhone);

  return (
    <label className="label">
      Mobile
      <span className="grid grid-cols-[minmax(7.5rem,9rem)_minmax(0,1fr)] gap-2">
        <select
          className="field text-base font-normal"
          name="country_code"
          defaultValue={countryCode || DEFAULT_PHONE_COUNTRY_CODE}
          aria-label="Country code"
        >
          {PHONE_COUNTRY_CODES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
        <input
          className="field text-base font-normal"
          name="phone"
          type="tel"
          inputMode="tel"
          maxLength={20}
          autoComplete="off"
          placeholder="0412 345 678"
          defaultValue={nationalNumber}
        />
      </span>
    </label>
  );
}

function AddPersonForm({ token }: { token: string }) {
  const [state, action] = useActionState(submitTedNameAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status, state.savedAt]);

  return (
    <>
      {state.status === "success" ? (
        <div key={state.savedAt} className="mt-8 flex flex-wrap items-center gap-4" role="status" aria-live="polite">
          <span className="locked-in-stamp" aria-hidden="true">Locked in</span>
          <p className="font-semibold text-emerald-100">{state.message}</p>
        </div>
      ) : null}
      {state.status === "error" ? (
        <p className="mt-8 rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/10 p-4 text-[#ffb0a9]" role="alert">
          {state.message}
        </p>
      ) : null}

      <form ref={formRef} action={action} className="surface mt-8 grid gap-6 p-5 sm:p-7">
        <input type="hidden" name="token" value={token} />

        <label className="label text-base">
          Who are we adding?
          <input className="field text-base font-normal" name="full_name" required maxLength={120} autoComplete="off" placeholder="Full name" />
        </label>

        <label className="label text-base">
          What do you call them?
          <input className="field text-base font-normal" name="nickname" required maxLength={80} autoComplete="off" placeholder="Nickname" />
          <span className="text-xs font-normal">Use the name they would instantly recognise.</span>
        </label>

        <fieldset className="grid gap-3">
          <legend className="label text-base">How can we reach them?</legend>
          <p className="text-xs text-[var(--chalk-muted)]">One is plenty. Don&apos;t go hunting for both.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <MobileField />
            <label className="label">Email<input className="field text-base font-normal" name="email" type="email" maxLength={320} autoComplete="off" /></label>
          </div>
        </fieldset>

        <label className="label text-base">
          Anything worth knowing?
          <textarea
            className="field min-h-28 resize-y text-base font-normal"
            name="note"
            maxLength={1000}
            placeholder="Lives overseas, hard to contact, usually goes by another surname..."
          />
        </label>

        <PendingButton idle="Add them to the team sheet" pending="Adding..." />
      </form>
    </>
  );
}

function EditPersonForm({ token, entry }: { token: string; entry: TeamSheetEntry }) {
  const [state, action] = useActionState(updateTedNameAction, initialState);

  return (
    <form action={action} className="mt-5 grid gap-4 border-t border-white/10 pt-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="id" value={entry.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">Full name<input className="field text-base font-normal" name="full_name" required maxLength={120} defaultValue={entry.full_name} /></label>
        <label className="label">Nickname<input className="field text-base font-normal" name="nickname" required maxLength={80} defaultValue={entry.nickname} /></label>
        <MobileField defaultPhone={entry.phone} />
        <label className="label">Email<input className="field text-base font-normal" name="email" type="email" maxLength={320} defaultValue={entry.email || ""} /></label>
      </div>
      <label className="label">Anything worth knowing?<textarea className="field min-h-24 resize-y text-base font-normal" name="note" maxLength={1000} defaultValue={entry.note || ""} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <PendingButton idle="Save changes" pending="Saving..." />
        {state.message ? (
          <span className={state.status === "success" ? "text-sm text-emerald-200" : "text-sm text-[#ffb0a9]"} role={state.status === "error" ? "alert" : "status"}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function TedTeamSheet({ token, entries }: { token: string; entries: TeamSheetEntry[] }) {
  return (
    <>
      <AddPersonForm token={token} />

      <section className="mt-12" aria-labelledby="current-team-sheet">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Already picked</p>
            <h2 id="current-team-sheet" className="display mt-2 text-3xl">Your team sheet</h2>
          </div>
          <span className="mono text-sm text-[var(--gold-light)]">{entries.length}</span>
        </div>

        {entries.length ? (
          <div className="mt-5 grid gap-3">
            {entries.map((entry) => (
              <details id={`entry-${entry.id}`} key={entry.id} className="surface-flat group p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="display break-words text-xl">{entry.full_name}</h3>
                    <p className="mono mt-1 break-words text-sm text-[var(--gold-light)]">{entry.nickname}</p>
                    {entry.phone || entry.email ? (
                      <p className="mt-2 break-words text-xs leading-5 text-[var(--chalk-muted)]">
                        {[entry.phone, entry.email].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--gold-light)] group-open:hidden">Edit</span>
                  <span className="hidden shrink-0 text-sm font-semibold text-[var(--gold-light)] group-open:inline">Close</span>
                </summary>
                <EditPersonForm token={token} entry={entry} />
              </details>
            ))}
          </div>
        ) : (
          <p className="surface-flat mt-5 px-5 py-8 text-center text-sm text-[var(--chalk-muted)]">
            Your first pick will appear here.
          </p>
        )}
      </section>
    </>
  );
}
