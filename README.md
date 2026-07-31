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
- A Supabase Pro project, or the Supabase CLI and Docker for local development
- A Vercel project for production

Install packages and copy `.env.example` to `.env.local`. Fill every required value. `ADMIN_WEBHOOK_URL` is optional.

Apply `supabase/migrations/202607310001_initial.sql`, then load `supabase/seed.sql` only in a development environment. Generate database types after the local database is running:

```sh
npm run db:types -- > types/database.generated.ts
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

Only punters with RSVP status `yes` owe the current per-head amount. Other statuses show zero owed. Change this rule in the SQL views only after the groomsmen agree.

The implementation currently signs punter JWTs with `SUPABASE_JWT_SECRET` to match `claude.md`. For a new Supabase project, complete the signing-key compatibility spike in `V1_PLAN.md` before production. If the project uses imported asymmetric keys, update both token minting and verification together.

Bank CSVs must contain one date column, one amount column, and one description or reference column. The import stores mappings and transaction fingerprints, stages all rows, and records only explicitly confirmed exact-reference matches.

## Security notes

- Never put `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `IP_HASH_SALT`, `TED_INTAKE_TOKEN`, or `CRON_SECRET` in a public environment variable.
- Keep the `vault` bucket private. Media is served through short-lived signed URLs.
- Do not point Vercel previews at production Supabase.
- Run the RLS matrix against the real project before uploading private media.
- The source copy check rejects em dash characters, as required by the project brief.
