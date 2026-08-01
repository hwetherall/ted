# Ted

Private trip headquarters for Ted's bachelor party in Australia, April 2027.

The app has three deliberately different doors:

- Groomsmen use allow-listed Supabase Auth magic links under `/admin`.
- Punters use Ted's nickname challenge under `/login` and receive a custom cookie JWT.
- Ted receives one reusable, isolated `/ted/[token]` intake link and cannot read anything back.

Money moves through Harry's Australian bank account. The app calculates, records, and reconciles payments, but never processes them.

## What is built

- Ted intake, groomsman review, and transactional roster import
- Punter nickname quiz, returning login, device lockouts, audit trail, and admin override
- RSVP, travel details, crew honour board, trip home, and timezone-aware itinerary
- Integer-cent cost engine, punter payment instructions, manual ledger, and staged bank CSV reconciliation
- Direct-to-Supabase vault uploads, photo metadata removal, progress, moderation, private signed delivery, quotas, and stale-upload cleanup
- Explicit RLS and grants for every public table, plus privacy-focused views and tests

See [V1_PLAN.md](V1_PLAN.md) for delivery scope and acceptance criteria.

## Local setup

Requirements:

- Node.js 20 or newer
- The Supabase CLI, installed globally or run through `npx`
- A Supabase Pro project, or Docker for a fully local Supabase stack
- A Vercel project for production

Install packages and copy `.env.example` to `.env.local`:

```sh
npm install
cp .env.example .env.local
```

Fill the Supabase values, application secrets, event settings, PayID, and at least Harry's admin email. `GROOMSMEN_EMAILS` may contain a partial list during local development, but all five addresses are required before launch. Keep Harry first because the first address becomes the treasurer.

`ADMIN_WEBHOOK_URL` is optional. When present, it must accept a JSON body with a `text` property, such as a Slack Incoming Webhook. A missing value disables failed-login notifications without affecting login.

`DEEPSEEK_API_KEY` is an optional reserved server-side secret. No current application code reads it and V1 has no AI feature. Keep it without a `NEXT_PUBLIC_` prefix until a specific server-side integration and data-handling policy are designed.

### Local Supabase

Start the local stack and rebuild it from the committed migration and development seed:

```sh
supabase start
supabase db reset
mkdir -p types
npm run db:types -- > types/database.generated.ts
```

`supabase db reset` is destructive to the local database. It applies `supabase/migrations/202607310001_initial.sql` and then loads `supabase/seed.sql` with fake development data.

### Hosted Supabase

Link the repository to the intended development or staging project, preview the migration, and then apply it:

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
mkdir -p types
supabase gen types typescript --linked > types/database.generated.ts
```

Do not load `supabase/seed.sql` into production. If the linked project contains valuable data, inspect the dry run and take a backup before applying migrations.

Configure these Supabase Auth redirect URLs before testing groomsman magic links:

```text
http://localhost:3000/admin/auth/callback
https://your-production-domain.example/admin/auth/callback
```

Start the app:

```sh
npm run dev
```

Before opening production, run:

```sh
npm run check:copy
npm run lint
npm run typecheck
npm test
npm run build
```

## Required setup decisions

The current defaults are Melbourne and 10 April 2027. Confirm the city and dates before loading the itinerary.

`GROOMSMEN_EMAILS` is ordered. The first address is labelled as treasurer during first login, so put Harry first.

Generated secrets must remain independent. Use separate values for `IP_HASH_SALT`, `TED_INTAKE_TOKEN`, and `CRON_SECRET`. The intake token is embedded in `/ted/[token]`, so generate it from URL-compatible characters, for example with `openssl rand -hex 32`.

Only punters with RSVP status `yes` owe the current per-head amount. Other statuses show zero owed. Change this rule in the SQL views only after the groomsmen agree.

The implementation currently signs punter JWTs with `SUPABASE_JWT_SECRET` to match `claude.md`. For a new Supabase project, complete the signing-key compatibility spike in `V1_PLAN.md` before production. If the project uses imported asymmetric keys, update both token minting and verification together.

Bank CSVs must contain one date column, one amount column, and one description or reference column. The import stores mappings and transaction fingerprints, stages all rows, and records only explicitly confirmed exact-reference matches.

## Security notes

- Never put `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `IP_HASH_SALT`, `TED_INTAKE_TOKEN`, or `CRON_SECRET` in a public environment variable.
- Treat `DEEPSEEK_API_KEY` as a server-only secret even though it is not used yet. Never rename it to `NEXT_PUBLIC_DEEPSEEK_API_KEY`.
- Keep the `vault` bucket private. Media is served through short-lived signed URLs.
- Do not point Vercel previews at production Supabase.
- Run the RLS matrix against the real project before uploading private media.
- The source copy check rejects em dash characters, as required by the project brief.
