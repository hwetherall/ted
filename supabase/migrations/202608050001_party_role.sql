begin;

create type public.party_role as enum ('guest', 'groomsman');

alter table public.ted_submissions
  add column party_role public.party_role not null default 'guest';

alter table public.punters
  add column party_role public.party_role not null default 'guest';

comment on column public.ted_submissions.party_role is
  'Ted''s classification: guest or groomsman. Not an admin permission.';

comment on column public.punters.party_role is
  'Guest or groomsman on the trip. Not an admin permission; separate from public.groomsmen.';

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
    full_name, display_name, email, phone, nickname, organiser_note, party_role, payment_reference
  ) values (
    staged.full_name, staged.full_name, staged.email, staged.phone,
    staged.nickname, staged.note, staged.party_role, candidate
  ) returning id into new_id;

  update public.ted_submissions set status = 'imported' where id = staged.id;
  return new_id;
end;
$$;

revoke all on function public.import_ted_submission(uuid) from public, anon, punter;
grant execute on function public.import_ted_submission(uuid) to authenticated;

commit;
