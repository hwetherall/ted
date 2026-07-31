# CLAUDE.md

Project instructions for Claude Code / Cursor. Read this file fully before writing any code.

---

## 1. What this is

A private website to organise a stag do (bachelor party) in Australia for **Ted**, who is getting married in **April 2027**.

**People:**
- ~20 attendees ("punters"). 18 are Australia-based. 2 are international: Harry (Denver, USA) and Sam (Scotland).
- 5 groomsmen act as admins. Harry is one of them and is the money person.
- Ted himself has a deliberately crippled, write-only view. He must never see the itinerary, the vault, the costs, or the crew list.

**The organiser is Harry.** He holds an Australian bank account despite living in the US.

This is a temporary site with a lifespan of roughly nine months. It is not a product. It is not a startup. Optimise for "finished and working" over "extensible."

---

## 2. Non-negotiables

These are decisions already made after deliberation. Do not "improve" them, do not substitute a more conventional approach, and do not silently simplify them away. If you think one is wrong, say so in chat and wait, do not unilaterally change it.

1. **No Stripe, no card processing, no payment gateway in V1.** See section 8. The site is a ledger, not a merchant.
2. **File uploads never pass through a Next.js route handler body.** Direct browser to Supabase via signed upload URL. See section 9.
3. **Punter authentication is a custom nickname quiz, not Supabase Auth.** See section 7. Do not replace it with magic links or OAuth.
4. **Ted has no login and no navigation.** One route, one form. See section 11.
5. **All money is integer cents, AUD.** Never floats. Never a `numeric` column you then read into a JS number.
6. **All timestamps are `timestamptz` stored in UTC.** Display logic handles timezones. See section 10.
7. **The service role key never reaches the browser.** Server-side only, always.
8. **No em-dashes in any UI copy, comment, commit message, or generated content.** Use commas, colons, parentheses, or a full stop. This applies to everything you write.

---

## 3. Stack

- **Next.js** (App Router, TypeScript)
- **Vercel** for hosting
- **Supabase** for Postgres, Storage, and RLS. Not Supabase Auth for punters.
- **Tailwind CSS**
- **`jose`** for signing and verifying punter session JWTs
- **`@node-rs/argon2`** or **`bcryptjs`** for nickname hashing
- **`date-fns-tz`** or **`Temporal`** polyfill for timezone handling
- **`heic2any`** for client-side HEIC conversion

Do not add a state management library. Do not add an ORM. Use the Supabase client directly with generated types (`supabase gen types typescript`).

---

## 4. The three tiers

| | Groomsmen | Punters | Ted |
|---|---|---|---|
| Route prefix | `/admin` | `/trip` | `/ted/[token]` |
| Auth | Supabase Auth magic link, email allow-list of 5 | Nickname quiz, custom JWT cookie | None. Unguessable URL. |
| Can read | Everything | Own record, published itinerary, approved vault, crew names | Nothing |
| Can write | Everything | Own RSVP, vault uploads | One staging form |

Groomsmen get **flat access**. All five see and do the same things. Do not build a role or permission system. The only differentiation is a `is_treasurer` boolean on Harry's record, used purely to label the ledger view with who reconciles payments.

---

## 5. Data model

All tables in the `public` schema. Enable RLS on every one of them.

```sql
-- ============================================================
-- GROOMSMEN (admins)
-- ============================================================
create table groomsmen (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  name          text not null,
  is_treasurer  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- PUNTERS (the core roster object: identity + RSVP + profile)
-- ============================================================
create type rsvp_status as enum ('unknown', 'yes', 'no', 'maybe');
create type invite_priority as enum ('must', 'nice');

create table punters (
  id                  uuid primary key default gen_random_uuid(),

  -- identity
  full_name           text not null,
  display_name        text not null,   -- shown in the login picker, disambiguated: "Dave M."
  email               text,
  phone               text,            -- E.164, e.g. +61412345678

  -- the nickname mechanic (see section 7)
  nickname            text,            -- PLAINTEXT. server-only. never selectable by a punter.
  nickname_hash       text,            -- for returning-visit password check
  claimed_at          timestamptz,     -- null until they pass the quiz

  -- RSVP and logistics
  rsvp_status         rsvp_status not null default 'unknown',
  arrival_at          timestamptz,
  departure_at        timestamptz,
  arrival_airport     text,
  dietary_notes       text,
  drinks_alcohol      boolean,
  how_they_know_ted   text,

  -- money
  payment_reference   text not null unique,  -- e.g. "TED-MARSH-4417"
  invite_priority     invite_priority not null default 'nice',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

**Why `nickname` is stored in plaintext:** the quiz needs to generate decoy options drawn from *other* punters' real nicknames, which means the server must be able to read them. A hash cannot do that. The plaintext column is protected by RLS restricted to the service role, and is never returned by any punter-scoped query. `nickname_hash` exists separately because after the first successful quiz the nickname becomes a typed password on return visits, and that comparison should run against a hash. Keep both columns. Do not collapse them.

```sql
-- ============================================================
-- PAYMENT LEDGER
-- ============================================================
create type payment_method as enum ('payid', 'bank_transfer', 'wise', 'cash', 'other');

create table payments (
  id            uuid primary key default gen_random_uuid(),
  punter_id     uuid not null references punters(id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0),
  method        payment_method not null,
  received_at   timestamptz not null default now(),
  recorded_by   uuid references groomsmen(id),
  note          text,
  created_at    timestamptz not null default now()
);
```

Partial payments are the norm, not the exception. A punter's balance is `amount_owed - sum(payments.amount_cents)`. Never store a "paid" boolean on `punters`.

```sql
-- ============================================================
-- COST ENGINE
-- ============================================================
create type cost_type as enum ('fixed', 'per_head');

create table costs (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  amount_cents  integer not null check (amount_cents >= 0),
  cost_type     cost_type not null,
  is_confirmed  boolean not null default false,  -- estimate vs locked in
  paid_by       uuid references groomsmen(id),   -- who fronted it
  notes         text,
  created_at    timestamptz not null default now()
);
```

**Cost per head** = `(sum of fixed costs / confirmed headcount) + (sum of per_head costs)`, where confirmed headcount is `count(punters where rsvp_status = 'yes')`. Expose this as a Postgres view or an RPC so admin and punter views cannot drift. Round up to the nearest dollar and note the rounding surplus in admin.

Guard against divide-by-zero when headcount is 0.

```sql
-- ============================================================
-- ITINERARY
-- ============================================================
create table itinerary_items (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  location_name   text,
  address         text,
  map_url         text,
  cost_note       text,
  is_published    boolean not null default false,  -- draft until groomsmen agree
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
```

```sql
-- ============================================================
-- VAULT
-- ============================================================
create type vault_kind as enum ('photo', 'video', 'story', 'other');
create type moderation_status as enum ('pending', 'approved', 'rejected');

create table vault_items (
  id                     uuid primary key default gen_random_uuid(),
  kind                   vault_kind not null,
  storage_path           text,        -- path within the 'vault' bucket. null for text-only stories.
  mime_type              text,
  size_bytes             bigint,
  story_text             text,        -- for text-only submissions
  caption                text,
  submitted_by           uuid references punters(id) on delete set null,
  is_anonymous           boolean not null default false,
  era_tag                text,        -- free text: "school", "uni", "footy", "the London years"
  moderation_status      moderation_status not null default 'pending',
  cleared_for_slideshow  boolean not null default false,
  created_at             timestamptz not null default now()
);
```

When `is_anonymous` is true, `submitted_by` is still populated (you need it for abuse handling and upload quotas) but must **never** be exposed outside the service role. Build the punter-facing vault query off a view that omits it entirely rather than relying on the client not to select it.

```sql
-- ============================================================
-- TED'S STAGING TABLE
-- ============================================================
create type submission_status as enum ('new', 'imported', 'discarded');

create table ted_submissions (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  email            text,
  phone            text,
  nickname         text not null,
  invite_priority  invite_priority not null default 'nice',
  note             text,
  status           submission_status not null default 'new',
  submitted_at     timestamptz not null default now()
);
```

Ted's submissions never write directly into `punters`. A groomsman reviews, dedupes, sanity-checks the nickname, and imports.

```sql
-- ============================================================
-- AUTH ATTEMPTS AND LOCKOUTS
-- ============================================================
create table auth_attempts (
  id                uuid primary key default gen_random_uuid(),
  punter_id         uuid references punters(id) on delete cascade,  -- who they claimed to be
  chosen_nickname   text,
  success           boolean not null,
  device_id         text not null,
  ip_hash           text,
  user_agent        text,
  created_at        timestamptz not null default now()
);

create table lockouts (
  device_id     text primary key,
  locked_until  timestamptz not null,
  failed_count  integer not null default 1,
  created_at    timestamptz not null default now()
);
```

`ip_hash` is a salted hash, not a raw IP. Do not store raw IPs.

---

## 6. Row Level Security

Write explicit policies. Do not leave any table with RLS enabled and no policy while relying on the service role to do everything, because that hides mistakes.

**Two client roles exist:**
- `authenticated` via Supabase Auth, and a `groomsmen` row exists for that user id → admin
- A custom JWT signed with the project's JWT secret carrying `{ role: 'punter', punter_id: <uuid> }` → punter

Supabase RLS can validate a self-signed JWT provided it is signed with the same secret. Sign it server-side with `jose`, set it as an httpOnly, secure, sameSite=lax cookie, and pass it as the Supabase client's access token for punter-scoped reads.

**Policy intent:**

| Table | Punter | Groomsman |
|---|---|---|
| `punters` | select own row (all columns except `nickname`), update own RSVP/profile fields only | full |
| `punters_public` (view) | select `id, display_name, rsvp_status, how_they_know_ted, arrival_at, arrival_airport` for all | full |
| `payments` | select own only | full |
| `costs` | none. Punters see only the derived per-head figure via the summary view. | full |
| `itinerary_items` | select where `is_published = true` | full |
| `vault_items_public` (view) | select where `moderation_status = 'approved'`, with `submitted_by` omitted and attribution resolved to a display name or "Anonymous". Insert via server route only. | full on base table |
| `ted_submissions` | none | full |
| `auth_attempts`, `lockouts` | none | select, delete |

A punter must never be able to read another punter's `payment_reference`, balance, `nickname`, phone, or email.

---

## 7. Punter authentication: the nickname quiz

This is the distinctive part of the product. Build it exactly as specified.

**Ted assigns every punter a nickname** as part of his intake form. That nickname becomes both the login challenge and, afterwards, the punter's password.

### First-time flow

1. One link is shared in the group chat: `/login`. No per-person tokens.
2. The punter picks their own name from a list of `display_name` values. Disambiguate collisions with a surname initial, because there will be more than one Dave.
3. Server returns **three nickname options**: the punter's real nickname plus two decoys **drawn from other punters' actual assigned nicknames**. Not random words, not generated filler. This is what makes the quiz "do you know this crew" rather than a coin flip.
4. Correct answer → set `claimed_at`, write `nickname_hash`, sign a session JWT, set the cookie, redirect to `/trip`.
5. Wrong answer → log the attempt, apply lockout, show a flat failure screen with no hint about which option was right and no indication of how close they were.

### Return visits

Session cookie is long-lived (90 days). If it is gone, they land on `/login/returning`, pick their name, and **type** their nickname. Compared against `nickname_hash`. Case-insensitive, trimmed, and ignore internal whitespace differences.

### Lockout rules

**Key the lockout to `device_id`, not to `punter_id`.** This is important and easy to get wrong. If the lockout attached to the person being impersonated, one bored member of the group chat could run through all twenty names, deliberately fail each, and lock the entire party out the day before a deposit deadline. Keying to the device means a prankster only locks themselves.

- `device_id` is a random UUID set as an httpOnly cookie on first visit to `/login`. Yes, it is clearable. That is acceptable. Read the threat model below.
- On failure: insert into `lockouts` with `locked_until = now() + interval '24 hours'`.
- While locked, `/login` shows the lockout screen with the unlock time in the viewer's local timezone and a line telling them to message a groomsman.
- **Admin override is mandatory.** `/admin/security` lists lockouts with a one-click clear. Someone will genuinely blank on their own nickname the week of the event and will need the itinerary immediately. Do not ship a 24-hour wait you cannot override.

### Notification

Do not build push notifications or real-time alerts. Log every attempt to `auth_attempts` and surface failures in `/admin/security`. Fire a single webhook POST (URL from `ADMIN_WEBHOOK_URL`) into wherever the groomsmen coordinate. If the env var is absent, skip silently.

### Threat model, stated plainly

The gate protects a photo vault and an itinerary. No payment credentials sit behind it, because money moves through a bank account outside this system. The realistic threat is a stranger stumbling onto a link shared inside a private group chat, not a motivated attacker. Build accordingly. Do **not** add rate limiting middleware, CAPTCHA, email verification, or 2FA. Do hash the nickname and do use httpOnly cookies, because those are close to free.

---

## 8. Payments: there is no payment integration

**Do not integrate Stripe. Do not add a checkout flow. Do not add a payment provider SDK.**

Money moves outside this system:

- **The 18 Australian punters** pay by **PayID or bank transfer** directly into Harry's Australian bank account, quoting their unique `payment_reference`.
- **Harry and Sam** (international) send AUD via **Wise** into the same account.
- Every punter's `/trip/pay` page shows: the amount owed, the amount received so far, the balance, the PayID address, and their `payment_reference` in a large monospace block with a copy button.

**The site's job is the ledger, not the rails.** Build:

- `/admin/ledger`: every punter, owed, paid, balance, last payment date, sorted by outstanding balance descending. Manual "record a payment" form.
- **A CSV import** at `/admin/ledger/import`. Harry uploads a bank transaction export, the app parses it, matches the `payment_reference` inside each transaction description, and proposes matched payments for one-click confirmation. This is the single highest-leverage admin feature in the build. Do not auto-commit matches, always propose and confirm.
- Make the CSV parser tolerant: column names vary by bank, so let the user map columns on first import and remember the mapping.

`payment_reference` format: `TED-<SURNAME>-<4 random digits>`. Uppercase, no ambiguous characters, short enough to survive a bank's description field truncation.

---

## 9. Storage and the vault

**Bucket layout (Supabase Storage):**
- `vault` (private). All punter uploads.
- `public-assets` (public). Itinerary images, map pins, site furniture only. Never user content.

Never make the `vault` bucket public.

### Upload flow, mandatory

Vercel serverless functions cap request bodies at **4.5MB**. A single iPhone photo can exceed that and a video certainly will. Therefore:

1. Browser calls `POST /api/vault/upload-url` with filename, mime type, and size.
2. Route handler validates the punter session, enforces size and type limits, inserts the `vault_items` row with `moderation_status = 'pending'`, and calls `createSignedUploadUrl()`.
3. Route returns the signed URL and the new row id.
4. **Browser PUTs the bytes directly to Supabase.** Bytes never touch a route handler.
5. Browser calls `POST /api/vault/confirm` with the row id to mark the upload complete.

Handle the abandoned-upload case: a nightly cleanup, or simply filter out rows with no confirmed upload after an hour.

### Client-side handling

- **HEIC**: iPhones will hand over `.heic` files that browsers will not render reliably. Convert with `heic2any` before upload. Decide this now, not after 200 files land.
- **EXIF**: strip GPS data before upload. Nobody needs the vault leaking home addresses.
- **Caps**: 200MB per file, 500MB per punter, enforced server-side at the signed-URL step. 4K iPhone video runs roughly 150MB to 400MB per minute depending on settings, so the cap matters.
- Show real upload progress. A 200MB upload on hotel wifi without a progress bar reads as a broken site.

### Serving

Serve vault media through short-expiry signed URLs. Generate thumbnails via Supabase image transformations, and cache aggressively, because transformations are metered.

### Supabase plan

Use **Pro ($25/month)**. The free tier pauses projects after a week of inactivity, which is fatal for a site that sits quiet between bursts of activity. Pro includes 100GB storage, comfortably beyond what 20 people will generate.

---

## 10. Timezones

Three populations: Australia (18), US Mountain Time (Harry), UK (Sam). This will cause bugs unless handled deliberately.

- **Store everything as `timestamptz` in UTC.**
- **The event timezone is the source of truth for display.** Set it as a single exported constant, `EVENT_TZ`, currently `'Australia/Melbourne'`. **TODO: confirm the actual destination city with Harry.**
- Itinerary times render in `EVENT_TZ` with the label visible ("Sat 10 Apr, 7:00pm AEST"). Never render a bare time.
- If the viewer's browser timezone differs from `EVENT_TZ`, show their local equivalent as smaller secondary text underneath. This matters only for pre-trip planning, since everyone is in Australia during the event.
- The countdown on `/trip` renders in the viewer's local time.
- Admin itinerary authoring inputs are **in `EVENT_TZ`**, clearly labelled, and converted on write. Harry will be entering these from Denver and this is where the bug will be.

Beware: Australia observes DST and the northern hemisphere does not observe it at the same times. April is an AEDT-to-AEST transition month in Victoria and New South Wales. Do not do timezone maths by hand, use the library.

---

## 11. Ted's view

Route: `/ted/[token]`. Single long random token in an env var, sent to Ted once.

**Rules:**
- No login, no nav bar, no footer links, no shared layout with the rest of the site.
- The page must not hint that anything else exists. No logo linking home, no "back to site."
- One form: full name, email, phone, **nickname**, must-invite versus nice-to-have, optional note.
- Writes to `ted_submissions`, never to `punters`.
- **The link is reusable and does not expire.** Ted will trickle in more names over the following weeks. Do not build single-use tokens.
- After submit, show a confirmation and reset the form for another entry. Show a running count of how many he has added, and nothing else.
- Add `noindex` and a `robots.txt` disallow across the whole site.

---

## 12. Routes

```
/                          redirect: session → /trip, else → /login

/login                     name picker → nickname quiz
/login/returning           name picker → type nickname
/login/locked              lockout screen

/trip                      home: countdown, next event, balance, quick RSVP state
/trip/rsvp                 RSVP + profile form
/trip/itinerary            published itinerary
/trip/pay                  amount owed, PayID details, payment reference
/trip/vault                upload + browse approved items
/trip/crew                 who is coming (names only, no financials)

/ted/[token]               Ted's intake form. No nav.

/admin                     dashboard: headcount, total collected, outstanding, pending vault items
/admin/roster              punter CRUD, nicknames, RSVP overrides
/admin/ledger              payment ledger
/admin/ledger/import       bank CSV reconciliation
/admin/costs               cost items + live per-head calculation
/admin/itinerary           itinerary editor with publish toggle
/admin/vault               moderation queue
/admin/intake              review and import Ted's submissions
/admin/security            failed attempts, active lockouts, one-click unlock

/api/auth/punter/options   POST: returns 3 nickname options for a given punter
/api/auth/punter/verify    POST: verifies choice, sets session cookie
/api/auth/punter/password  POST: returning-visit password check
/api/vault/upload-url      POST: signed upload URL
/api/vault/confirm         POST: mark upload complete
```

---

## 13. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never imported into a client component
SUPABASE_JWT_SECRET=              # for signing punter session tokens

TED_INTAKE_TOKEN=                 # the long random slug in /ted/[token]
ADMIN_WEBHOOK_URL=                # optional, failed-login pings
GROOMSMEN_EMAILS=                 # comma-separated allow-list, 5 addresses

NEXT_PUBLIC_EVENT_TZ=Australia/Melbourne
NEXT_PUBLIC_EVENT_START=          # ISO datetime, TODO: confirm
NEXT_PUBLIC_PAYID=                # Harry's PayID address
```

---

## 14. Design direction

Overwrite this section if Harry has a different vision. Otherwise commit to it fully rather than half-applying it.

**Concept: the club honour board.** Not a wedding site, not a SaaS dashboard. The visual world is an Australian sporting club: the painted honour board in the clubhouse, the squad list pinned to the wall, the fixtures chalked up behind the bar. This suits the subject, and it gives the nickname mechanic somewhere to live, because a nickname on an honour board is the most natural thing in the world.

**Palette:**
```
--board:   #1B3329   /* bottle green, primary surface */
--ink:     #101A16   /* near-black green, deep background */
--chalk:   #F2EFE6   /* warm off-white, primary text */
--gold:    #C8A951   /* honour board lettering, nicknames, claimed states */
--signal:  #C1443B   /* outstanding balances, lockouts, urgency. Use sparingly. */
```

Deliberately not the warm-cream-plus-serif-plus-terracotta palette that every generated site defaults to.

**Type:**
- Display: **Bricolage Grotesque** (variable, characterful, not overexposed). Used at large sizes with tight tracking, in caps for section headers.
- Body: **Public Sans**.
- Utility: **JetBrains Mono** for payment references, amounts, countdown digits, and reference codes. Money and codes should always be monospaced, because they get read aloud and copied.

**Signature element:** the crew page rendered as an actual honour board. Every punter is a row in gold lettering on green. Claimed punters show their nickname. Unclaimed punters show a blank slot, which does quiet double duty as social pressure to log in. This is the one place to spend visual boldness. Keep everything else disciplined.

**Restraint:** no scroll animations, no gradient meshes, no glassmorphism. One page-load reveal on the honour board and nothing else. Respect `prefers-reduced-motion`.

**Mobile first, genuinely.** The day-of itinerary view will be read one-handed, outdoors, on a cracked phone, possibly by someone several drinks in. The `/trip` home screen at 5pm on the day should show the next event, its address, and a map link, and almost nothing else.

---

## 15. Copy guidelines

- Sentence case throughout. No title case headers.
- Active voice. A button says exactly what happens: "Record payment," not "Submit."
- Keep the vocabulary consistent. If the money page says "outstanding," admin says "outstanding" too, never "balance due."
- Errors state what happened and what to do about it. They do not apologise and they are never vague.
- Empty states are invitations: "Nothing in the vault yet. Be the first to embarrass him."
- The tone is a group chat between mates, not a wedding planner and not enterprise software. Dry, brief, warm.
- **No em-dashes.**

---

## 16. Build order

Ship in this order. Do not start a phase before the previous one runs end to end.

**Phase 1: foundation**
Schema, RLS policies, generated types, Supabase Auth for the 5 groomsmen, `/admin` shell, punter CRUD at `/admin/roster`. Seed with fake data.

**Phase 2: Ted's intake**
`/ted/[token]`, `ted_submissions`, `/admin/intake` review and import. This unblocks Ted, who is the long pole, since nothing else can be populated until he supplies names and nicknames.

**Phase 3: punter auth**
The nickname quiz, device lockouts, `/admin/security`. Nothing punter-facing works until this does.

**Phase 4: RSVP and crew**
`/trip/rsvp`, `/trip/crew`, the honour board.

**Phase 5: money**
`costs`, the per-head engine, `/trip/pay`, `/admin/ledger`, CSV import.

**Phase 6: itinerary**
`/admin/itinerary`, `/trip/itinerary`, timezone handling, the day-of view.

**Phase 7: vault**
Buckets, signed upload flow, HEIC conversion, moderation queue.

---

## 17. Explicitly out of scope for V1

Do not build these. They were considered and deferred.

- Polls and a decision log
- Broadcast email or SMS
- An arrivals board
- Real-time notifications of any kind
- A plus-one or guest-of-guest flow
- Multi-currency display
- Any Stripe integration
- Groomsman role permissions
- A public marketing page

---

## 18. Open decisions, ask Harry before assuming

1. **Which Australian city?** `EVENT_TZ` is currently guessed as `Australia/Melbourne`.
2. **Actual dates of the stag do.** Needed for the countdown and the itinerary skeleton.
3. **Domain name.** Should be boring and reveal nothing. Ted may see it over someone's shoulder.
4. **Does Ted know the site exists?** Changes how coy `/ted/[token]` needs to be.
5. **Is the per-head cost shown to punters before it is final?** Watching the number move as people drop out is either the best feature or a source of twenty anxious messages, depending on the crew.