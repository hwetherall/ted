begin;

alter table public.punters
  add column if not exists organiser_note text;

comment on column public.punters.organiser_note is
  'Private organiser context. Never expose to punters.';

drop view public.punter_self;

alter table public.punters
  drop column invite_priority;

alter table public.ted_submissions
  drop column invite_priority;

drop type public.invite_priority;

create view public.punter_self
with (security_barrier = true)
as
select id, full_name, display_name, email, phone, claimed_at, rsvp_status, arrival_at,
  departure_at, arrival_airport, dietary_notes, drinks_alcohol, how_they_know_ted,
  payment_reference, created_at, updated_at
from public.punters
where id = ((select auth.jwt()) ->> 'punter_id')::uuid;

revoke all on public.punter_self from anon, authenticated, punter;
grant select on public.punter_self to punter, authenticated;

create or replace function public.import_ted_submission(p_submission_id uuid)
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
    raise exception 'Team sheet entry is not available';
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
    full_name, display_name, email, phone, nickname, organiser_note, payment_reference
  ) values (
    staged.full_name, staged.full_name, staged.email, staged.phone,
    staged.nickname, staged.note, candidate
  ) returning id into new_id;

  update public.ted_submissions set status = 'imported' where id = staged.id;
  return new_id;
end;
$$;

revoke all on function public.import_ted_submission(uuid) from public, anon, punter;
grant execute on function public.import_ted_submission(uuid) to authenticated;

commit;
