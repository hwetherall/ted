create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'punter') then
    create role punter nologin;
  end if;
end
$$;

grant punter to authenticator;
grant anon to punter;
grant usage on schema public to punter;

create type public.rsvp_status as enum ('unknown', 'yes', 'no', 'maybe');
create type public.invite_priority as enum ('must', 'nice');
create type public.payment_method as enum ('payid', 'bank_transfer', 'wise', 'cash', 'other');
create type public.cost_type as enum ('fixed', 'per_head');
create type public.vault_kind as enum ('photo', 'video', 'story', 'other');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');
create type public.submission_status as enum ('new', 'imported', 'discarded');
create type public.bank_row_status as enum ('matched', 'ambiguous', 'unmatched', 'confirmed', 'ignored', 'duplicate');

create table public.groomsmen (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  is_treasurer boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.punters (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  display_name text not null,
  email text,
  phone text,
  nickname text,
  nickname_hash text,
  claimed_at timestamptz,
  rsvp_status public.rsvp_status not null default 'unknown',
  arrival_at timestamptz,
  departure_at timestamptz,
  arrival_airport text,
  dietary_notes text,
  drinks_alcohol boolean,
  how_they_know_ted text,
  payment_reference text not null unique check (payment_reference ~ '^TED-[A-Z0-9]+-[0-9]{4}$'),
  invite_priority public.invite_priority not null default 'nice',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  punter_id uuid not null references public.punters(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method public.payment_method not null,
  received_at timestamptz not null default now(),
  recorded_by uuid references public.groomsmen(id),
  note text,
  import_row_id uuid,
  created_at timestamptz not null default now()
);

create table public.costs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount_cents integer not null check (amount_cents >= 0),
  cost_type public.cost_type not null,
  is_confirmed boolean not null default false,
  paid_by uuid references public.groomsmen(id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  address text,
  map_url text check (map_url is null or map_url ~ '^https://'),
  cost_note text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  kind public.vault_kind not null,
  storage_path text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  story_text text,
  caption text,
  submitted_by uuid references public.punters(id) on delete set null,
  is_anonymous boolean not null default false,
  era_tag text,
  moderation_status public.moderation_status not null default 'pending',
  cleared_for_slideshow boolean not null default false,
  upload_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (storage_path is not null or nullif(trim(story_text), '') is not null)
);

create table public.ted_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  nickname text not null,
  invite_priority public.invite_priority not null default 'nice',
  note text,
  status public.submission_status not null default 'new',
  submitted_at timestamptz not null default now()
);

create table public.auth_attempts (
  id uuid primary key default gen_random_uuid(),
  punter_id uuid references public.punters(id) on delete cascade,
  chosen_nickname text,
  success boolean not null,
  device_id text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.lockouts (
  device_id text primary key,
  locked_until timestamptz not null,
  failed_count integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.bank_import_profiles (
  id uuid primary key default gen_random_uuid(),
  groomsman_id uuid not null references public.groomsmen(id) on delete cascade,
  header_signature text not null,
  mapping jsonb not null,
  updated_at timestamptz not null default now(),
  unique (groomsman_id, header_signature)
);

create table public.bank_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_fingerprint text not null unique,
  imported_by uuid not null references public.groomsmen(id),
  created_at timestamptz not null default now()
);

create table public.bank_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.bank_import_batches(id) on delete cascade,
  source_fingerprint text not null unique,
  transaction_date date,
  amount_cents integer not null check (amount_cents > 0),
  description text not null,
  extracted_reference text,
  matched_punter_id uuid references public.punters(id),
  status public.bank_row_status not null,
  created_at timestamptz not null default now()
);

alter table public.payments
  add constraint payments_import_row_id_fkey
  foreign key (import_row_id) references public.bank_import_rows(id);

create index payments_punter_id_idx on public.payments (punter_id);
create index payments_received_at_idx on public.payments (received_at desc);
create unique index payments_import_row_unique_idx on public.payments (import_row_id) where import_row_id is not null;
create index punters_rsvp_status_idx on public.punters (rsvp_status);
create index itinerary_items_starts_at_idx on public.itinerary_items (starts_at);
create index vault_items_submitted_by_idx on public.vault_items (submitted_by);
create index vault_items_moderation_idx on public.vault_items (moderation_status, created_at desc);
create index auth_attempts_punter_idx on public.auth_attempts (punter_id);
create index auth_attempts_created_idx on public.auth_attempts (created_at desc);
create index bank_import_rows_batch_idx on public.bank_import_rows (batch_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger punters_set_updated_at
before update on public.punters
for each row execute function private.set_updated_at();

create trigger bank_profiles_set_updated_at
before update on public.bank_import_profiles
for each row execute function private.set_updated_at();

create function private.is_groomsman()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groomsmen where id = (select auth.uid())
  );
$$;

revoke all on function private.is_groomsman() from public;
grant execute on function private.is_groomsman() to authenticated;

alter table public.groomsmen enable row level security;
alter table public.punters enable row level security;
alter table public.payments enable row level security;
alter table public.costs enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.vault_items enable row level security;
alter table public.ted_submissions enable row level security;
alter table public.auth_attempts enable row level security;
alter table public.lockouts enable row level security;
alter table public.bank_import_profiles enable row level security;
alter table public.bank_import_batches enable row level security;
alter table public.bank_import_rows enable row level security;

create policy "Groomsmen manage groomsmen"
on public.groomsmen for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage punters"
on public.punters for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Punters select own row"
on public.punters for select to punter
using (id = ((select auth.jwt()) ->> 'punter_id')::uuid);

create policy "Punters update own row"
on public.punters for update to punter
using (id = ((select auth.jwt()) ->> 'punter_id')::uuid)
with check (id = ((select auth.jwt()) ->> 'punter_id')::uuid);

create policy "Groomsmen manage payments"
on public.payments for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Punters select own payments"
on public.payments for select to punter
using (punter_id = ((select auth.jwt()) ->> 'punter_id')::uuid);

create policy "Groomsmen manage costs"
on public.costs for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage itinerary"
on public.itinerary_items for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Punters select published itinerary"
on public.itinerary_items for select to punter
using (is_published = true);

create policy "Groomsmen manage vault"
on public.vault_items for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage Ted submissions"
on public.ted_submissions for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage auth attempts"
on public.auth_attempts for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage lockouts"
on public.lockouts for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage import profiles"
on public.bank_import_profiles for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage import batches"
on public.bank_import_batches for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

create policy "Groomsmen manage import rows"
on public.bank_import_rows for all to authenticated
using ((select private.is_groomsman()))
with check ((select private.is_groomsman()));

revoke all on public.groomsmen, public.punters, public.payments, public.costs,
  public.itinerary_items, public.vault_items, public.ted_submissions,
  public.auth_attempts, public.lockouts, public.bank_import_profiles,
  public.bank_import_batches, public.bank_import_rows from anon, authenticated, punter;

grant select, insert, update, delete on public.groomsmen, public.punters, public.payments,
  public.costs, public.itinerary_items, public.vault_items, public.ted_submissions,
  public.auth_attempts, public.lockouts, public.bank_import_profiles,
  public.bank_import_batches, public.bank_import_rows to authenticated;

grant select (id, full_name, display_name, email, phone, claimed_at, rsvp_status,
  arrival_at, departure_at, arrival_airport, dietary_notes, drinks_alcohol,
  how_they_know_ted, payment_reference, invite_priority, created_at, updated_at)
on public.punters to punter;

grant update (rsvp_status, arrival_at, departure_at, arrival_airport, dietary_notes,
  drinks_alcohol, how_they_know_ted, email, phone)
on public.punters to punter;

grant select on public.payments, public.itinerary_items to punter;

create view public.punters_public
with (security_barrier = true)
as
select id, display_name, rsvp_status, how_they_know_ted, arrival_at, arrival_airport,
  case when claimed_at is null then null else nickname end as nickname
from public.punters
where (select auth.role()) = 'punter' or (select private.is_groomsman());

create view public.punter_self
with (security_barrier = true)
as
select id, full_name, display_name, email, phone, claimed_at, rsvp_status, arrival_at,
  departure_at, arrival_airport, dietary_notes, drinks_alcohol, how_they_know_ted,
  payment_reference, invite_priority, created_at, updated_at
from public.punters
where id = ((select auth.jwt()) ->> 'punter_id')::uuid;

create view public.cost_summary
with (security_barrier = true)
as
with totals as (
  select
    coalesce(sum(amount_cents) filter (where cost_type = 'fixed'), 0)::bigint as fixed_cents,
    coalesce(sum(amount_cents) filter (where cost_type = 'per_head'), 0)::bigint as per_head_cents,
    coalesce(bool_or(not is_confirmed), false) as has_estimates
  from public.costs
), heads as (
  select count(*)::bigint as headcount from public.punters where rsvp_status = 'yes'
), calculated as (
  select *, fixed_cents + headcount * per_head_cents as event_total_cents
  from totals cross join heads
)
select
  headcount::integer as confirmed_headcount,
  fixed_cents,
  per_head_cents,
  event_total_cents,
  case when headcount = 0 then 0
    else (((event_total_cents + headcount * 100 - 1) / (headcount * 100)) * 100)::integer
  end as amount_per_head_cents,
  case when headcount = 0 then 0
    else ((((event_total_cents + headcount * 100 - 1) / (headcount * 100)) * 100) * headcount - event_total_cents)::integer
  end as rounding_surplus_cents,
  has_estimates
from calculated
where (select auth.role()) = 'punter' or (select private.is_groomsman());

create view public.punter_payment_summary
with (security_barrier = true)
as
select
  p.id as punter_id,
  p.payment_reference,
  case when p.rsvp_status = 'yes' then c.amount_per_head_cents else 0 end as amount_owed_cents,
  coalesce(sum(pay.amount_cents), 0)::integer as amount_paid_cents,
  case when p.rsvp_status = 'yes' then c.amount_per_head_cents else 0 end - coalesce(sum(pay.amount_cents), 0)::integer as outstanding_cents,
  max(pay.received_at) as last_payment_at,
  c.has_estimates
from public.punters p
cross join public.cost_summary c
left join public.payments pay on pay.punter_id = p.id
where p.id = ((select auth.jwt()) ->> 'punter_id')::uuid
group by p.id, p.payment_reference, p.rsvp_status, c.amount_per_head_cents, c.has_estimates;

create view public.ledger_summary
with (security_barrier = true)
as
select
  p.id as punter_id,
  p.display_name,
  p.rsvp_status,
  p.payment_reference,
  case when p.rsvp_status = 'yes' then c.amount_per_head_cents else 0 end as amount_owed_cents,
  coalesce(sum(pay.amount_cents), 0)::integer as amount_paid_cents,
  case when p.rsvp_status = 'yes' then c.amount_per_head_cents else 0 end - coalesce(sum(pay.amount_cents), 0)::integer as outstanding_cents,
  max(pay.received_at) as last_payment_at
from public.punters p
cross join public.cost_summary c
left join public.payments pay on pay.punter_id = p.id
where (select private.is_groomsman())
group by p.id, p.display_name, p.rsvp_status, p.payment_reference, c.amount_per_head_cents;

create view public.vault_items_public
with (security_barrier = true)
as
select
  v.id, v.kind, v.storage_path, v.mime_type, v.size_bytes, v.story_text, v.caption,
  v.is_anonymous, v.era_tag, v.cleared_for_slideshow, v.created_at,
  case when v.is_anonymous then 'Anonymous' else coalesce(p.display_name, 'A mate') end as attribution
from public.vault_items v
left join public.punters p on p.id = v.submitted_by
where v.moderation_status = 'approved'
  and (v.storage_path is null or v.upload_confirmed_at is not null)
  and ((select auth.role()) = 'punter' or (select private.is_groomsman()));

revoke all on public.punters_public, public.punter_self, public.cost_summary,
  public.punter_payment_summary, public.ledger_summary, public.vault_items_public
from anon, authenticated, punter;

grant select on public.punters_public, public.punter_self, public.cost_summary,
  public.punter_payment_summary, public.vault_items_public to punter;
grant select on public.punters_public, public.punter_self, public.cost_summary,
  public.punter_payment_summary, public.ledger_summary, public.vault_items_public to authenticated;

create function public.import_ted_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  staged public.ted_submissions;
  new_id uuid;
  surname text;
  candidate text;
  attempts integer := 0;
begin
  if not private.is_groomsman() then
    raise exception 'Not authorized';
  end if;

  select * into staged from public.ted_submissions
  where id = p_submission_id and status = 'new'
  for update;

  if not found then
    raise exception 'Submission is not available';
  end if;

  surname := upper(regexp_replace(split_part(trim(staged.full_name), ' ', array_length(string_to_array(trim(staged.full_name), ' '), 1)), '[^A-Za-z0-9]', '', 'g'));
  if surname = '' then surname := 'MATE'; end if;

  loop
    attempts := attempts + 1;
    candidate := 'TED-' || left(surname, 12) || '-' || lpad((floor(random() * 10000))::integer::text, 4, '0');
    exit when not exists (select 1 from public.punters where payment_reference = candidate);
    if attempts > 30 then raise exception 'Could not generate payment reference'; end if;
  end loop;

  insert into public.punters (
    full_name, display_name, email, phone, nickname, invite_priority, payment_reference
  ) values (
    staged.full_name, staged.full_name, staged.email, staged.phone,
    staged.nickname, staged.invite_priority, candidate
  ) returning id into new_id;

  update public.ted_submissions set status = 'imported' where id = staged.id;
  return new_id;
end;
$$;

revoke all on function public.import_ted_submission(uuid) from public, anon, punter;
grant execute on function public.import_ted_submission(uuid) to authenticated;

create function public.reserve_vault_upload(
  p_punter_id uuid,
  p_kind public.vault_kind,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_caption text,
  p_is_anonymous boolean,
  p_era_tag text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  used_bytes bigint;
  new_id uuid;
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Not authorized'; end if;
  if p_size_bytes <= 0 or p_size_bytes > 209715200 then raise exception 'File is too large'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_punter_id::text, 0));

  select coalesce(sum(size_bytes), 0) into used_bytes
  from public.vault_items
  where submitted_by = p_punter_id
    and storage_path is not null
    and (upload_confirmed_at is not null or created_at > now() - interval '2 hours');

  if used_bytes + p_size_bytes > 524288000 then raise exception 'Upload allowance exceeded'; end if;

  insert into public.vault_items (
    kind, storage_path, mime_type, size_bytes, caption, submitted_by, is_anonymous, era_tag
  ) values (
    p_kind, p_storage_path, p_mime_type, p_size_bytes, nullif(trim(p_caption), ''),
    p_punter_id, p_is_anonymous, nullif(trim(p_era_tag), '')
  ) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.reserve_vault_upload(uuid, public.vault_kind, text, text, bigint, text, boolean, text) from public, anon, authenticated, punter;
grant execute on function public.reserve_vault_upload(uuid, public.vault_kind, text, text, bigint, text, boolean, text) to service_role;

create function public.confirm_bank_import_rows(p_row_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not private.is_groomsman() then raise exception 'Not authorized'; end if;

  insert into public.payments (
    punter_id, amount_cents, method, received_at, recorded_by, note, import_row_id
  )
  select
    r.matched_punter_id,
    r.amount_cents,
    'bank_transfer'::public.payment_method,
    coalesce((r.transaction_date::timestamp + interval '12 hours') at time zone 'UTC', now()),
    (select auth.uid()),
    'Imported from ' || b.filename,
    r.id
  from public.bank_import_rows r
  join public.bank_import_batches b on b.id = r.batch_id
  where r.id = any(p_row_ids)
    and r.status = 'matched'
    and r.matched_punter_id is not null
  on conflict (import_row_id) where import_row_id is not null do nothing;

  get diagnostics inserted_count = row_count;

  update public.bank_import_rows
  set status = 'confirmed'
  where id = any(p_row_ids)
    and exists (select 1 from public.payments p where p.import_row_id = bank_import_rows.id);

  return inserted_count;
end;
$$;

revoke all on function public.confirm_bank_import_rows(uuid[]) from public, anon, punter;
grant execute on function public.confirm_bank_import_rows(uuid[]) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 209715200)
on conflict (id) do update set public = false, file_size_limit = 209715200;

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = true;

create policy "Groomsmen manage vault objects"
on storage.objects for all to authenticated
using (bucket_id = 'vault' and (select private.is_groomsman()))
with check (bucket_id = 'vault' and (select private.is_groomsman()));

create policy "Everyone reads public assets"
on storage.objects for select to anon, authenticated, punter
using (bucket_id = 'public-assets');

create policy "Groomsmen manage public assets"
on storage.objects for all to authenticated
using (bucket_id = 'public-assets' and (select private.is_groomsman()))
with check (bucket_id = 'public-assets' and (select private.is_groomsman()));
