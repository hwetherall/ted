# Ted V1 build plan

This plan translates `claude.md` into an implementation sequence for the private bachelor party app. It preserves the seven required phases and the stated V1 boundaries.

## 1. V1 outcome

V1 is complete when:

- Ted can add invite suggestions through his isolated, reusable intake link.
- A groomsman can review those suggestions, build the roster, and manage every operational part of the trip.
- A punter can pass the nickname challenge, update their RSVP, see the crew, view published itinerary items, see what they owe, and use the moderated vault.
- Harry can calculate per-head cost, record or import bank payments, and reconcile outstanding balances.
- Ted cannot discover or read the trip, crew, costs, ledger, or vault through the app.
- Authorization and privacy boundaries are enforced in Postgres, not only in the UI.
- The primary mobile flows work on current iPhone and Android browsers.

The app remains a private, temporary tool. It does not include payments, messaging, polls, granular admin roles, or a public site.

## 2. Preflight gates

Resolve these before Phase 1 implementation starts.

### Product inputs from Harry

1. Confirm the Australian destination city and IANA timezone.
2. Confirm the event start and end dates.
3. Choose the deliberately boring domain.
4. Confirm whether Ted knows a separate organiser site exists.
5. Decide whether punters see the per-head figure while it is still an estimate.
6. Confirm who owes money: only `rsvp_status = 'yes'`, or every invited punter until they decline.
7. Confirm how overpayments, refunds, and a paid punter later declining should appear in V1.
8. Supply the five groomsmen email addresses, Harry's PayID, and the failed-login webhook URL if one will be used.
9. Obtain one or two real, redacted CSV exports from Harry's Australian bank so the importer is designed against actual formats.

### Technical feasibility checks

1. Create a Supabase Pro project and a Vercel project in the intended regions.
2. Prove the punter JWT flow against the current Supabase signing-key system:
   - The required outcome remains a server-minted JWT carrying a punter identity claim and an httpOnly session cookie.
   - Create and grant a non-login Postgres `punter` role if the token's `role` claim remains `punter`.
   - Verify that PostgREST and Storage accept the token and that RLS can read `punter_id` from its claims.
   - Decide whether to retain the extractable legacy `SUPABASE_JWT_SECRET` or import an application-owned signing key. Record the decision in `claude.md` before coding the auth phase.
3. Prove a direct signed upload from a mobile browser to the private Supabase bucket, including upload progress. Test the resumable signed-upload path for large files.
4. Confirm HEIC conversion and GPS metadata removal on a representative iPhone photo.

Exit criterion: the open product inputs are recorded, and small technical spikes prove that custom JWT RLS and direct storage uploads are viable with the selected projects.

## 3. Technical shape

### Application boundaries

- Next.js App Router and TypeScript, deployed to Vercel.
- Server Components by default. Client Components only for interactive forms, the countdown, timezone-local equivalents, CSV mapping, and uploads.
- Supabase Postgres is the source of truth. SQL migrations, generated TypeScript types, and seed data are committed.
- Supabase Auth is used only for the five groomsmen.
- Punter authentication uses the nickname quiz and a server-signed cookie JWT.
- Service-role access lives in a clearly named server-only module. Client code cannot import it.
- Mutations with sensitive validation use Server Actions or route handlers. Media bytes go directly from the browser to Supabase Storage.
- No ORM, global state library, payment SDK, or general permissions framework.

### Suggested repository layout

```text
app/
  (auth)/login/...
  trip/...
  admin/...
  ted/[token]/...
  api/auth/punter/...
  api/vault/...
components/
  admin/
  trip/
  ui/
lib/
  auth/
  csv/
  money/
  supabase/
  time/
  uploads/
supabase/
  migrations/
  seed.sql
tests/
  e2e/
  integration/
  unit/
```

### Database rules to make explicit

- Enable RLS on every public table in the migration that creates it.
- Use explicit grants as well as RLS. RLS limits rows, while grants limit operations and columns.
- Keep `nickname` and `nickname_hash` out of all punter-readable relations.
- Restrict punter updates to the allowed RSVP and profile columns through column grants or a narrowly scoped RPC. Do not rely on a row policy to protect columns.
- Define public-facing views with `security_invoker = true`, or use carefully reviewed functions where a security-definer operation is required.
- Put security-definer helper functions in an unexposed private schema, set an empty or fixed `search_path`, and grant execution only to the required role.
- Add indexes for RLS and common sorting paths, especially `payments.punter_id`, `auth_attempts.punter_id`, `auth_attempts.created_at`, `vault_items.submitted_by`, `vault_items.moderation_status`, `itinerary_items.starts_at`, and `punters.rsvp_status`.
- Add a trigger for `punters.updated_at`.
- Return all money calculations as integer cents.

### Minimal schema additions to approve

The brief requires CSV mapping memory and reliable confirmation, but does not define persistence for them. Add the smallest supporting model after Harry approves it:

- `bank_import_profiles`: a header signature and saved column mapping.
- `bank_import_batches`: file metadata, importer, and import status.
- `bank_import_rows`: normalized date, integer amount, description, extracted reference, match status, and a fingerprint used to prevent accidental duplicate imports.
- An upload confirmation timestamp or status on `vault_items`, so pending moderation is distinguishable from an abandoned upload.

These additions support stated behavior and do not expand the product scope.

## 4. Delivery phases

Each phase must run end to end in a Vercel preview deployment before the next phase starts.

### Phase 1: foundation

Deliverables:

- Scaffold Next.js, TypeScript, Tailwind, linting, tests, and environment validation.
- Add the bottle-green honour-board tokens, typography, base components, mobile shell, loading states, empty states, and accessible form patterns.
- Add `robots.txt` with a site-wide disallow and noindex metadata.
- Create the enums, core tables, helper functions, views, grants, RLS policies, indexes, and generated types.
- Seed fake groomsmen, punters, costs, payments, itinerary items, vault items, attempts, and lockouts.
- Implement groomsman magic-link login, email allow-list enforcement, callback, sign-out, and protected `/admin` layout.
- Implement `/admin` summary cards using fake or seeded data.
- Implement `/admin/roster` create, read, update, and delete flows, including unique payment-reference generation.
- Add automated authorization tests proving that a non-groomsman authenticated user cannot access admin data.

Acceptance criteria:

- All migrations rebuild a clean local Supabase database.
- Each of the five allow-listed emails can reach `/admin`; every other email is rejected even if Supabase Auth issues a session.
- Admin roster changes persist and validation errors are specific.
- No service key or nickname field is present in client bundles or punter-safe views.
- The app works at 320px width and passes keyboard navigation and basic contrast checks.

Estimated effort: 4 to 6 focused development days.

### Phase 2: Ted's intake

Deliverables:

- Build the isolated `/ted/[token]` layout with no shared navigation, home link, or metadata leakage.
- Validate the environment token server-side and render a generic not-found response for invalid tokens.
- Implement the reusable intake form, confirmation state, form reset, and submission count.
- Write only to `ted_submissions` through a server-side action.
- Implement `/admin/intake` with new, imported, and discarded filters.
- Add review, edit, duplicate detection, discard, and import actions.
- Import into `punters` transactionally and generate a unique `TED-<SURNAME>-<4 digits>` reference.

Acceptance criteria:

- Ted can submit several names without seeing any existing names or other app routes.
- Refreshing or reusing the link works.
- Importing a submission creates exactly one punter and marks the staging row imported in the same transaction.
- Retrying an import cannot create a duplicate.

Estimated effort: 2 to 3 days.

Release checkpoint: send Ted his intake link as soon as this phase reaches production.

### Phase 3: punter authentication

Deliverables:

- Implement the shared name picker using only `id` and disambiguated `display_name`.
- Set the random `device_id` in an httpOnly cookie on the first login visit.
- Implement nickname option generation with exactly one real nickname and two distinct decoys. Prefer real nicknames belonging to other punters, then fill missing slots from a fixed ten-name bench until enough real nicknames exist. Randomize order server-side.
- Normalize typed nicknames by trimming, lowercasing, and collapsing internal whitespace.
- On a correct first claim, hash the normalized nickname, set `claimed_at`, log success, mint the 90-day JWT cookie, and redirect to `/trip`.
- Implement returning login against `nickname_hash`.
- On failure, log the attempt, hash the IP with an application salt, create or update a device lockout for 24 hours, and send the optional webhook without blocking the response.
- Implement local-time unlock display on `/login/locked`.
- Implement `/admin/security` with failed attempts, active lockouts, and one-click clear.
- Add route guards for `/trip` and redirect behavior for `/`.

Acceptance criteria:

- Options never expose whether a punter is claimed and never contain generated filler.
- A wrong answer reveals no correctness hint and locks only the current device.
- Clearing a lockout in admin allows that device to retry immediately.
- A returning punter can sign in with case and whitespace differences.
- A valid punter can read only their safe self record through RLS. Cross-punter private reads and writes fail in database integration tests.
- Missing `ADMIN_WEBHOOK_URL` has no visible effect.

Estimated effort: 4 to 6 days.

### Phase 4: RSVP and crew

Deliverables:

- Build `/trip` with countdown, next published event, outstanding amount summary, and current RSVP state.
- Build `/trip/rsvp` for only the allowed profile and travel fields.
- Build `/trip/crew` from `punters_public` as the signature honour board.
- Show a nickname only when the punter has claimed. Show a blank slot for unclaimed punters.
- Resolve whether declined punters remain visible on the honour board and document the rule.
- Add the shared punter mobile navigation and session sign-out.

Acceptance criteria:

- A punter can update only their own allowed fields.
- Crew responses contain no email, phone, payment reference, nickname hash, private nickname for unclaimed users, or financial data.
- The home screen shows the next actionable event prominently when an event exists.
- Honour-board reveal animation respects reduced-motion settings.

Estimated effort: 2 to 3 days.

### Phase 5: money

Deliverables:

- Implement `/admin/costs` with fixed and per-head costs, estimate or confirmed state, payer, notes, and live calculation.
- Put the cost-per-head calculation in one SQL view or RPC. Use integer arithmetic, round up to the nearest dollar, report the rounding surplus, and return a safe empty state at zero confirmed headcount.
- Implement `/trip/pay` with integer-cent amounts, received total, outstanding amount, PayID, and a large copyable payment reference.
- Implement `/admin/ledger`, sorted by outstanding amount descending, with manual partial-payment recording.
- Implement CSV upload, preview, column mapping, remembered profiles, normalization, reference matching, unmatched and ambiguous states, duplicate detection, and explicit confirmation.
- Insert confirmed matches transactionally. Never commit proposed matches automatically.
- Provide an audit-friendly link from each imported payment to its batch and source row.

Acceptance criteria:

- Admin and punter surfaces always display the same derived amount owed.
- Zero headcount, partial payments, overpayments, and several payments per person render without special-case bugs.
- Re-uploading the same bank file warns about duplicates and cannot silently record the same transaction twice.
- Ambiguous and unmatched rows never create a payment.
- Currency formatting is AUD, while storage and calculations remain integer cents.

Estimated effort: 5 to 7 days.

### Phase 6: itinerary

Deliverables:

- Implement `/admin/itinerary` create, edit, order, delete, and publish controls.
- Label authoring inputs with `EVENT_TZ` and convert event-local input to UTC on write.
- Implement `/trip/itinerary` with published items only.
- Render event timezone and abbreviation on every time. Add the viewer's local equivalent when it differs.
- Make the next-event card dominant on the trip home screen, with address and map link.
- Test times across the Australian DST boundary in April.

Acceptance criteria:

- Draft items never appear through the punter client or a direct API request.
- An admin in Denver can enter an Australia-local time and retrieve the intended instant.
- Itinerary order is stable, labels include timezone, and all external map links are safe.
- Day-of information is usable one-handed in bright-light mobile conditions.

Estimated effort: 3 to 4 days.

### Phase 7: vault

Deliverables:

- Create private `vault` and public `public-assets` buckets with explicit policies.
- Implement signed upload initialization with session checks, safe generated storage paths, MIME and extension allow-lists, 200MB per-file limit, and 500MB per-punter quota.
- Count both confirmed files and recent pending reservations when enforcing quota.
- Convert HEIC photos in the browser and re-encode photos to remove GPS metadata.
- Upload directly to Supabase with real progress and retry behavior. Use the resumable path for large files.
- Confirm upload completion separately and reject confirmations for rows not owned by the session punter.
- Add secured daily cleanup for expired unconfirmed rows and orphaned objects.
- Implement `/admin/vault` moderation, rejection, slideshow clearance, and short-expiry previews.
- Implement `/trip/vault` browsing of approved items and submission of media or text stories.
- Generate signed delivery URLs, use cached thumbnails, and omit `submitted_by` from the public view entirely.

Acceptance criteria:

- No media body passes through a Vercel route handler.
- An anonymous submission remains attributable to admins but cannot be attributed from any punter response.
- Pending and rejected items cannot be read by punters, even with a guessed row id or storage path.
- Quotas hold under concurrent upload initialization.
- Interrupted and abandoned uploads do not become visible and are cleaned up safely.
- HEIC, JPEG, PNG, and an allowed video type work on real mobile devices.

Estimated effort: 5 to 7 days.

## 5. Test and release strategy

### Test layers

- Unit tests: nickname normalization and option selection, payment-reference generation, integer cost arithmetic, CSV normalization and matching, file validation, and timezone conversion.
- Database integration tests: every RLS policy, view projection, column grant, helper function, and transaction RPC. Include explicit privacy tests for every sensitive column.
- End-to-end tests: Ted intake and import, first and returning punter login, device lockout and admin clear, RSVP update, manual and CSV payments, itinerary publishing, upload and moderation.
- Manual device tests: current iPhone Safari and Android Chrome for login, copy-to-clipboard, timezone display, HEIC conversion, a large upload, and the day-of itinerary.
- Static safeguards: TypeScript, lint, production build, secret-import boundary checks, and a source scan that rejects the em dash character.

### Environment progression

1. Local Next.js with local Supabase and deterministic fake data.
2. Vercel preview connected to a non-production Supabase project.
3. Production Vercel connected only to production Supabase.

Never point previews at production data. Keep environment variables scoped per environment. Store secrets only in Vercel and local uncommitted environment files.

### Launch checklist

- Apply and verify migrations, grants, RLS, bucket privacy, and generated types.
- Create the five groomsmen Auth users and corresponding roster records.
- Replace all fake data and confirm Ted intake imports.
- Set the final event timezone, dates, PayID, domain, intake token, JWT signing material, webhook, cron secret, and email allow-list.
- Run the full authorization suite against the production schema before loading sensitive vault content.
- Check noindex and robots behavior, HTTPS cookies, security headers, error pages, mobile layout, and backup recovery.
- Test a small real bank CSV in preview, then a harmless known transaction in production.
- Test one real photo and one representative large video end to end, then delete them through the intended admin flow.
- Write a one-page groomsman runbook for unlocks, CSV reconciliation, moderation, and emergency itinerary edits.

## 6. Delivery estimate

For one experienced full-stack developer, the seven phases total about 25 to 36 focused development days. Allow 6 to 8 calendar weeks for review, real-device testing, bank CSV samples, Supabase and Vercel setup, and feedback from the five groomsmen.

Suggested milestones:

- Week 1: preflight and foundation.
- Week 2: foundation complete, Ted intake live.
- Week 3: punter auth complete.
- Week 4: RSVP, crew, and money core.
- Week 5: CSV reconciliation and itinerary.
- Week 6: vault.
- Weeks 7 to 8: hardening, content loading, rehearsal, and launch buffer.

Ted's intake is the first production release. The complete V1 should launch at least four weeks before the first payment or logistics deadline, not merely before the trip.

## 7. Risks and controls

| Risk | Control |
| --- | --- |
| Current Supabase signing-key behavior differs from the legacy-secret assumption | Complete the JWT and RLS spike before schema policy work, then record the chosen key flow. |
| A safe-looking view bypasses RLS | Use `security_invoker`, explicit grants, and negative integration tests. |
| Column-level private data leaks from `punters` | Expose narrow views, restrict column grants, and test serialized responses. |
| Bank formats differ or the same file is imported twice | Use redacted real samples, mapping profiles, staged confirmation, and transaction fingerprints. |
| Event times shift because Harry enters them from Denver | Parse authoring input in `EVENT_TZ`, store UTC, and test DST boundaries. |
| Large mobile uploads fail on weak networks | Direct resumable upload, progress, retry, confirmation state, and cleanup. |
| Pending uploads consume quota forever | Reserve recent pending bytes and clean stale rows and objects daily. |
| A leaked Ted link exposes the organiser site | Use a high-entropy token, isolated layout, generic invalid response, noindex, and no cross-links. |
| Sensitive data appears in logs | Never log tokens, nickname input, raw IPs, signed URLs, or service-key errors. Hash IPs with a separate server secret. |
| Scope expands before core operations work | Treat every phase's acceptance criteria as a release gate and keep the explicit V1 exclusions closed. |

## 8. Definition of done

V1 is done only when all seven phase acceptance lists pass in a production-like environment, the privacy test matrix passes, real mobile upload and timezone checks pass, and the groomsmen can complete the critical workflows from the runbook without developer help.
