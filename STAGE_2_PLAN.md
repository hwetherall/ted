# Ted Stage 2 plan

Status: product discovery

This is the living plan for the next product iteration, referred to here as Stage 2. It is distinct from the numbered delivery phases in `V1_PLAN.md`. Confirmed decisions are recorded as product rules. Open questions remain explicit until Harry answers them. No Stage 2 implementation should begin until the relevant rules, authorization boundaries, migrations, and acceptance criteria are agreed.

## 1. Product direction

Ted's experience should feel like naming the team, not operating the event or completing an admin form. The language and small moments of delight should draw lightly on Ted and Harry's time playing AFL together for Old Geelong in the VAFA.

The central rule is:

> If Ted adds someone, they are invited.

Ted sees no invite ranking, target headcount, capacity indicator, or approval decision. The existing `must` and `nice` priority model must be removed from Ted's page and from the organisers' workflow and language. Organisers still need a clear invited headcount and confirmed RSVP headcount for planning, but neither creates a cap on Ted's selections.

Ted supplies only information that he is uniquely well placed to provide. Invitees supply RSVP, dietary, travel, location, availability, and other personal logistics later.

## 2. Team selection

### Outcome

Ted adds one invited person at a time through his private reusable link. Each successful addition becomes an instruction to include that person, not a suggestion for the organisers to accept or reject.

The same page shows Ted the people he has already added. He can open an existing entry, correct the name, nickname, mobile, email, or note, and save it. There is no separate review mode and no delete control. Harry can resolve the rare duplicate or mistaken entry directly through the organiser tools or Supabase backend.

The organiser side may still:

- identify and merge the occasional accidental duplicate;
- correct contact details or formatting;
- resolve ambiguous identities;
- complete the operational step that places the person on the live roster.

That work is processing, not approval. Organisers must not rank, discard, or second-guess a genuine selection because of group size.

Stage 2 will not introduce semantic duplicate detection, name matching, or duplicate warnings for Ted. At this scale, visible edit access plus occasional organiser correction is simpler and more trustworthy than an automated duplicate system. The submit control should still prevent an ordinary double-click while a save is in progress.

### Page copy

Eyebrow:

> Team sheet

Headline:

> Pick your people.

Intro:

> The Old Geelong selection committee is back for one final job, thankfully with less running. Add everyone you want there, one mate at a time. If they're on the team sheet, they're invited.

Running count example:

> 12 people on the team sheet

### Form

The form remains short and asks only:

1. **Who are we adding?**
   - Full name.
   - Required.
2. **What do you call them?**
   - Nickname.
   - Required.
   - Helper: "Use the name they would instantly recognise."
3. **How can we reach them?**
   - Mobile and email.
   - Both optional.
   - Helper: "One is plenty. Don't go hunting for both."
4. **Anything worth knowing?**
   - Optional note.
   - Placeholder: "Lives overseas, hard to contact, usually goes by another surname..."

Primary action:

> Add them to the team sheet

After a successful addition:

> Locked in. Who's next?

The form resets immediately and the running count increases. A restrained `LOCKED IN` team-sheet stamp acknowledges the addition, followed by the message above. The animation must remain brief, work on mobile, and respect reduced-motion preferences. With reduced motion enabled, the same confirmation appears without movement.

### Existing team sheet

Below the add form, Ted sees a compact team sheet containing only the people submitted through his link. Each row shows the person's full name and nickname, with available contact details secondary. An `Edit` action opens the same small set of fields and saves changes in place.

The list does not show organiser processing state, RSVP state, payment state, capacity, ranking, or whether a person has been placed on the live roster. The count is the number of current entries on Ted's team sheet. Organisers separately see selected, rostered, awaiting-processing, and confirmed RSVP totals for planning.

### Ted must not see

- invite ranking or priority;
- a target headcount or spots remaining;
- delete, approval, or organiser processing controls;
- RSVP, availability, dietary, location, or travel questions;
- itinerary, destination, costs, or organiser operations;
- terms such as submission, database, import, approval, or roster processing;
- navigation that reveals another part of the application.

### Message accompanying the link

> Mate, the Old Geelong selection committee has one last job: pick the side. Add everyone you want at the stag, one at a time, plus whatever nickname you actually call them. Don't worry if you're missing an email or number. You can come back to the same link to add people or fix details whenever you like.

## 3. Product and technical consequences

The current V1 implementation treats Ted's entries as ranked suggestions. Stage 2 must change that model consistently rather than only removing two radio buttons.

Required changes when implementation begins:

- remove `invite_priority` from the Ted form and its server-side validation;
- remove priority badges, fields, filters, and wording from organiser intake and roster screens;
- remove the priority value from the Ted-to-roster import operation;
- migrate away from `punters.invite_priority` and `ted_submissions.invite_priority`;
- remove the `invite_priority` enum when no remaining database object depends on it;
- add an admin-only `punters.organiser_note` field and copy Ted's optional note into it when an entry is placed on the roster;
- expose `organiser_note` for viewing and editing on the organiser roster while keeping it out of punter grants, punter-safe views, and every Ted response unrelated to his own team sheet;
- add token-scoped server operations that return and update only the entries submitted through Ted's valid private link;
- show organisers separate selected, rostered, awaiting-processing, and confirmed RSVP counts;
- update seed data, tests, generated types, README guidance, and the V1-era rules in `claude.md`;
- rename organiser-facing intake language so it describes processing Ted's team sheet, not approving suggestions;
- preserve the separation between Ted's editable team sheet and the live punter roster.

Ted's high-entropy reusable link is a bearer credential: anyone holding it can see and edit his team sheet, including the contact details it contains. This is accepted for the small, temporary, low-sensitivity flow. The page must remain `noindex`, use no-store responses, avoid third-party resources that could receive the token through a referrer, and reveal no other application data. Any later module containing more sensitive information requires a fresh authentication decision.

### Manual database preparation

Harry will add `public.punters.organiser_note` manually through the Supabase SQL editor before Stage 2 implementation. Codex must not run this change through the terminal. The column is private organiser context and must not be added to the `punter` role's column grants, `punter_self`, `punters_public`, or any other punter-readable relation.

SQL for Harry to run manually:

```sql
begin;

alter table public.punters
  add column if not exists organiser_note text;

comment on column public.punters.organiser_note is
  'Private organiser context. Never expose to punters.';

commit;
```

Optional privilege check after running it:

```sql
select
  has_column_privilege(
    'authenticated',
    'public.punters',
    'organiser_note',
    'SELECT'
  ) as authenticated_can_select,
  has_column_privilege(
    'punter',
    'public.punters',
    'organiser_note',
    'SELECT'
  ) as punter_can_select;
```

The expected result is `true` for `authenticated_can_select` and `false` for `punter_can_select`. Existing RLS still restricts the authenticated table access to groomsmen.

The later Stage 2 application work will update the roster-processing function so `ted_submissions.note` is copied to `punters.organiser_note`. Adding the column alone does not change the current import function.

## 4. Acceptance criteria for team selection

- The page presents one primary short add-person form, the existing team sheet, and no application navigation.
- Full name and nickname are required. Mobile, email, and note are optional.
- No priority, availability, RSVP, travel, dietary, location, or relationship input appears.
- A valid addition persists once, clears the visible form, updates the count, and shows the success message.
- Refreshing or revisiting the same link shows the current team sheet and allows another addition.
- Ted can edit the full name, nickname, mobile, email, and note for an existing team-sheet entry.
- Ted cannot see organiser processing state or data outside entries supplied through his private link.
- Ted's request and every organiser surface treat an added person as invited.
- Organisers can correct the occasional duplicate or mistaken entry without an invitation-ranking state.
- Organisers can view and edit `organiser_note`; punters cannot select it directly or through a view.
- The organiser dashboard distinguishes selected, rostered, awaiting-processing, and confirmed RSVP counts.
- Invalid tokens return the generic not-found experience and reveal nothing about the application.
- The `LOCKED IN` confirmation is brief and appears without motion when the user prefers reduced motion.
- The flow works at 320px width and with keyboard and screen-reader navigation.

## 5. Open decisions

### Remaining Stage 2 scope

- Define the format and audience for Ted's weekend dos and don'ts.
- Define what other tasks, if any, belong in Ted's private experience.
- Decide whether those later tasks may use the same bearer-link authorization or require stronger authentication.
