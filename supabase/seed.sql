insert into public.punters (
  full_name, display_name, email, phone, nickname, rsvp_status, arrival_at,
  arrival_airport, dietary_notes, drinks_alcohol, how_they_know_ted,
  payment_reference, organiser_note, claimed_at, nickname_hash
) values
  ('Dave Martin', 'Dave M.', 'dave@example.com', '+61411111111', 'Disco', 'yes', '2027-04-09 23:30:00+00', 'MEL', null, true, 'School', 'TED-MARTIN-1842', 'Usually answers WhatsApp first', now(), '$2b$10$seed.only.not.a.real.hash'),
  ('Dave Sullivan', 'Dave S.', 'sully@example.com', '+61422222222', 'Sully', 'maybe', null, null, 'Vegetarian', true, 'Footy', 'TED-SULLIVAN-5931', null, null, null),
  ('Sam Fraser', 'Sam F.', 'sam@example.com', '+447700900111', 'Haggis', 'yes', '2027-04-09 22:15:00+00', 'MEL', null, true, 'London years', 'TED-FRASER-2674', 'Travelling from Scotland', now(), '$2b$10$seed.only.not.a.real.hash'),
  ('Chris Nguyen', 'Chris N.', 'chris@example.com', '+61433333333', 'Nugget', 'yes', null, null, 'No shellfish', false, 'Uni', 'TED-NGUYEN-7316', null, null, null),
  ('Ben Clarke', 'Ben C.', 'ben@example.com', '+61444444444', 'Buckets', 'unknown', null, null, null, true, 'Work', 'TED-CLARKE-4028', null, null, null);

insert into public.costs (label, amount_cents, cost_type, is_confirmed, notes) values
  ('House', 320000, 'fixed', true, 'Three nights'),
  ('Saturday transport', 120000, 'fixed', false, 'Coach estimate'),
  ('Friday dinner', 6500, 'per_head', false, 'Set menu estimate');

insert into public.itinerary_items (
  title, description, starts_at, ends_at, location_name, address, map_url,
  cost_note, is_published, sort_order
) values
  ('First whistle', 'Drop bags, grab a drink, pretend everyone arrived on time.', '2027-04-09 08:00:00+00', '2027-04-09 10:00:00+00', 'The clubhouse', 'Melbourne VIC', 'https://maps.google.com', null, true, 10),
  ('Saturday fixture', 'Details stay under wraps until the groomsmen lock it in.', '2027-04-10 01:00:00+00', '2027-04-10 06:00:00+00', 'TBC', null, null, 'Included', false, 20);

insert into public.ted_submissions (full_name, email, nickname, note, party_role) values
  ('Alex Morgan', 'alex@example.com', 'Morgs', 'Used to work together', 'guest');
