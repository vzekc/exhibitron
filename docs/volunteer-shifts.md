# Volunteer shifts — design

Volunteers sign up for stretches of time in which an activity needs help. Three activities are
planned for the first event: Elektro-Aufbau, Infotresen betreuen, Fotofix betreuen. Anyone may help
— exhibitors with the account they already have, everyone else with a name and an email address that
is verified once.

The public face of this lives under `/mitmachen`; the code, like the rest of the repository, is
English and lives in `backend/src/modules/volunteer` and `frontend/src/pages/volunteer`.

## What exists already

| Need                                                             | Reuse                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-day time grid, 15-minute rows, mobile list fallback        | `frontend/src/components/schedule/` (`MultiDayScheduleGrid`, `MobileScheduleList`, `TimeSlot`), `DaySelector`, `TimeSelector`, `DurationSelector` |
| Long description, rich text with images                          | `Document` entity + `TextEditor` (Quill) + `ServerHtmlContent`, as `ConferenceSession.description` uses it                                        |
| Public form that writes to the database and mails a confirmation | `register` mutation and `modules/registration`                                                                                                    |
| HTML+text mail bodies written as React                           | `makeEmailBody` in `modules/common/emailUtils.ts`, `sendEmail`                                                                                    |
| Token in a mail, clicked back into the site                      | `User.passwordResetToken` / `passwordResetTokenExpires`, `/resetPassword` page, `db.user.createPasswordResetToken`                                |
| Linking a forum account to a local one                           | `/auth/forum?registrationToken=…` → `associateForumUser`                                                                                          |
| Scheduled background work                                        | `node-cron`, `app/cleanup.ts` (job body wrapped in `RequestContext.create`)                                                                       |
| Per-exhibition scoping, admin guard, exhibitor identity          | `Context` in `app/context.ts`, `AdminProtectedRoute`, `ProtectedRoute`                                                                            |
| Post-event deletion of personal data                             | `performCleanup` in `app/cleanup.ts`                                                                                                              |
| Calendar export                                                  | `generateICalContent` in `modules/schedule/ical.ts`                                                                                               |
| Tables, forms, modals, chips                                     | `DataTable`, `Form*`, `Modal`, `Confirm`, `Card`, `ActionBar`, `Breadcrumbs`                                                                      |

New in this feature: the activity/period/booking entities, coverage computation over free-form
booking spans, the passwordless volunteer identity, and a reminder job that runs at quarter-hour
granularity.

## Data model

Module `backend/src/modules/volunteer`, following the module layout of the repository (`entity.ts`,
`repository.ts`, `resolvers.ts`, `schema.graphql`, `test.ts`).

```
VolunteerActivity
  exhibition   → Exhibition
  key          string    slug, unique per exhibition: 'elektro-aufbau'
  name         string    'Elektro-Aufbau'
  summary      string    one line, always visible
  description  → Document?   long text, revealed on demand
  contact      → Exhibitor?  who to ask, and who hears about late cancellations
  ordering     int

VolunteerPeriod
  activity        → VolunteerActivity
  startTime       Date
  durationMinutes int
  neededCount     int?     null means as many as register
  note            string?  'Treffpunkt Halle 10, Osteingang'

VolunteerBooking
  period          → VolunteerPeriod
  user            → User
  startTime       Date
  durationMinutes int
  reminderSentAt  Date?
  digestSentAt    Date?
```

`startTime` + `durationMinutes` follows `ConferenceSession`; `endTime` is a computed GraphQL field.
Booking times snap to 15 minutes and must lie inside their period.

`User` gains one column:

```
  emailVerifiedAt Date?
```

The migration backfills it for every existing row — those accounts were created through an
admin-approved registration or a forum login, both of which prove the address.

### Identity

A booking always belongs to a `User`. An exhibitor already has one. Someone who self-registers gets
a `User` with no password, `emailVerifiedAt` unset, and a `passwordResetToken` that is mailed to
them; clicking the link sets `emailVerifiedAt`, establishes a session, and lands them on their shift
list. Later bookings from that session, or from that link, need no further mail.

This keeps one identity type across the whole application: a volunteer who registers as an exhibitor
later is the same row, and their shifts stay with them.

The mail carries a second button, "Mit Forum-Konto verbinden", pointing at
`/auth/forum?registrationToken=<token>` — the path exhibitor registration already uses, which sets
the nickname and turns the account into a full forum login.

The magic link stops working once the account has a password or a forum nickname; from then on the
shift list asks for a normal login. Tokens expire at the end of the exhibition.

### Names that belong to the forum

Someone whose name is already a forum nickname signs in through Woltlab rather than registering a
second identity. Two checks run when the self-registration form is submitted:

1. **Local.** The name matches no `User.nickname` and no `User.fullName`, and the email address
   matches no `User.email`, in this exhibition's account space. A match answers with "Dieser Name
   gehört zu einem Konto — bitte über das Forum anmelden" and a forum-login button.
2. **Forum.** `forum.classic-computing.de` is asked whether the nickname exists.

The second check needs an endpoint that the forum does not offer today. The interface required is
small:

```
GET /index.php?exhibitron-nickname-exists/&nickname=<name>
Authorization: Bearer <shared secret, EXHIBITRON_FORUM_API_TOKEN>
→ { "exists": true }
```

Until it exists the local check stands alone, guarded by an env var: with `FORUM_NICKNAME_API_URL`
unset the remote check is skipped. **This is the one piece of the design that depends on work
outside this repository.**

### Coverage

`neededCount` is a target, not a limit: nobody is turned away from a period that already has enough
people, and the calendar shows over-coverage as its own state rather than as a problem.

Coverage is computed per period by cutting the period at every booking boundary and counting the
bookings that cover each resulting span:

```
Infotresen Sa 10:00–18:00, needed 2

10   11   12   13   14   15   16   17   18
 ░░░░░████████████░░░░░░░░░░░▓▓▓▓▓▓▓▓▓░░░░
 └ 1  └ 2 (met)   └ 1        └ 3 (over)

Anna   10:00–13:00
Bernd  11:00–13:00
Clara  15:00–17:00
Dieter 15:00–17:00
Erik   15:00–17:00
```

A span is `none` (nobody), `under`, `met`, `over`, or `unlimited` (for a period with no
`neededCount`, where one person or more is `met`). The resolver returns the spans so that the
calendar, the activity page and the admin report all agree on the same arithmetic.

Bookings by a user whose address is not yet verified are shown, marked as unconfirmed, and left out
of the count until the address is verified.

### Conflicts

A booking is refused when it overlaps, for the same user:

- another volunteer booking, whatever the activity;
- a `ConferenceSession` they are listed on as an exhibitor.

The message names what is in the way: "Du hältst um 14:00 einen Vortrag." The conference-session
check is a query against the existing many-to-many between `ConferenceSession` and `Exhibitor`.

## GraphQL

```graphql
type VolunteerActivity {
  id: Int!
  key: String!
  name: String!
  summary: String!
  description: String
  contact: Exhibitor
  periods: [VolunteerPeriod!]!
}

type VolunteerPeriod {
  id: Int!
  activity: VolunteerActivity!
  startTime: Date!
  endTime: Date!
  neededCount: Int
  note: String
  coverage: [VolunteerCoverageSpan!]!
  bookings: [VolunteerBooking!]!
}

type VolunteerCoverageSpan {
  startTime: Date!
  endTime: Date!
  count: Int!
  unconfirmed: Int!
  needed: Int
  status: CoverageStatus!
}

enum CoverageStatus {
  none
  under
  met
  over
  unlimited
}

type VolunteerBooking {
  id: Int!
  period: VolunteerPeriod!
  startTime: Date!
  endTime: Date!
  name: String # null for anonymous callers
  confirmed: Boolean!
  isMine: Boolean!
}

extend type Query {
  getVolunteerActivities: [VolunteerActivity!]!
  getVolunteerActivity(key: String!): VolunteerActivity
  getMyVolunteerBookings: [VolunteerBooking!]!
}

extend type Mutation {
  bookVolunteerSlot(input: BookVolunteerSlotInput!): VolunteerBooking
  registerVolunteer(input: RegisterVolunteerInput!): RegisterVolunteerResult!
  confirmVolunteerEmail(token: String!): Boolean
  cancelVolunteerBooking(id: Int!): Boolean

  createVolunteerActivity(input: VolunteerActivityInput!): VolunteerActivity
  updateVolunteerActivity(id: Int!, input: VolunteerActivityInput!): VolunteerActivity
  deleteVolunteerActivity(id: Int!): Boolean
  createVolunteerPeriod(input: VolunteerPeriodInput!): VolunteerPeriod
  updateVolunteerPeriod(id: Int!, input: VolunteerPeriodInput!): VolunteerPeriod
  deleteVolunteerPeriod(id: Int!): Boolean
}

input BookVolunteerSlotInput {
  periodId: Int!
  startTime: Date!
  durationMinutes: Int!
}

input RegisterVolunteerInput {
  name: String!
  email: String!
  slot: BookVolunteerSlotInput!
}

enum RegisterVolunteerOutcome {
  verificationSent
  useForumLogin
  useLogin
}

type RegisterVolunteerResult {
  outcome: RegisterVolunteerOutcome!
  message: String!
}
```

`VolunteerBooking.name` is null for an anonymous caller and carries the full name for anyone logged
in; the coverage counts are public either way. Administrators additionally read the email address
through the admin queries.

`registerVolunteer` creates the account, the token and the first booking in one step, and answers
with what the visitor should do next — check their mail, log in through the forum, or log in
normally.

Mutation call sites in the frontend inspect `result.errors` and show the message, per the error
handling rule in `CLAUDE.md`.

## Pages

Public, no login:

- **`/mitmachen`** — the dense overview calendar plus the list of activities. Each activity shows
  its name, its one-line summary and a disclosure that reveals the long description.
- **`/mitmachen/:key`** — one activity: description, contact, its periods, and the sign-up.
- **`/mitmachen/bestaetigen?token=…`** — the landing page of the verification mail, mirroring
  `/resetPassword`.

Signed in, or holding a valid magic link:

- **`/mitmachen/meine-schichten`** — the volunteer's own shifts, each cancellable, with an iCal link
  built from `generateICalContent`.

Administration:

- **`/admin/volunteer`** — activities and their periods, and a coverage report listing every span
  that is `none` or `under`, soonest first.

The navigation bar gains a public "Mitmachen" entry.

### The overview calendar

One column per day, subdivided into one lane per activity that has a period on that day; time runs
down the vertical axis. The span of days comes from the periods themselves, earliest to latest, so
an Elektro-Aufbau on the day before the doors open and an Abbau on the last evening appear without
any special handling. The vertical range likewise comes from the earliest and latest period of the
day.

Each lane is painted from the coverage spans: empty, under-covered, met, over-covered. A tap or
click opens the sign-up for that activity at that time, with start and duration prefilled from where
the pointer landed.

```
        Do 14. Mai        Fr 15. Mai         Sa 16. Mai         So 17. Mai
        Elektro           Info  Foto         Info  Foto         Info  Abbau
 08:00  ▓▓▓▓▓▓▓
 10:00  ▓▓▓▓▓▓▓           ░░░░  ████         ████  ████         ████
 12:00  ███████           ████  ████         ████  ░░░░         ░░░░  ▒▒▒▒
 14:00                    ████  ░░░░         ████  ████               ▒▒▒▒
 16:00                    ░░░░  ████         ░░░░  ████               ▒▒▒▒

 ░ zu wenige   █ besetzt   ▓ mehr als nötig   ▒ niemand
```

The time-axis arithmetic and the 15-minute row structure come from
`components/schedule/MultiDayScheduleGrid`; the volunteer calendar is a component of its own beside
it, without the drag-and-drop machinery. `MobileScheduleList` is the model for the narrow-screen
rendering, one day at a time with `DaySelector`.

## Mails

Written as React through `makeEmailBody`, in German, in `modules/volunteer/emails.tsx`:

- **Adresse bestätigen** — the verification link, the forum-linking button, and the shift that was
  just booked.
- **Schicht eingetragen** — confirmation of a booking made by an already-verified volunteer.
- **Deine Schichten morgen** — the digest, sent at 20:00 the evening before, listing every shift of
  the coming day with times, meeting point and contact.
- **In einer Stunde** — a short reminder naming the one shift about to start.
- **Absage** — to the activity's contact when a shift is dropped within 24 hours of its start.

## Scheduled work

A new `app/volunteerReminders.ts` beside `app/cleanup.ts`, wrapping its body in
`RequestContext.create` the same way, on `cron.schedule('*/15 * * * *', …)`:

- at the 20:00 run, every user with an unsent booking starting the next day gets one digest;
  `digestSentAt` is stamped on each booking it covered;
- at every run, bookings starting in the next 60 to 75 minutes whose `reminderSentAt` is unset get
  the short reminder.

Both stamps make the job idempotent across restarts. Times are the server's local time,
Europe/Berlin.

The same job deletes unverified accounts, and their bookings, 48 hours after they were created.

`performCleanup` in `app/cleanup.ts` grows two steps: delete the exhibition's bookings, and delete
the users that exist only as volunteers — no password, no nickname, no exhibitor record — so that
volunteer data disappears with the registrations it sits beside.

## Configuration

- `FORUM_NICKNAME_API_URL`, `EXHIBITRON_FORUM_API_TOKEN` — the nickname check. Unset means the local
  check stands alone.

## Tests

`modules/volunteer/test.ts`, in the style of the other module tests:

- coverage arithmetic over overlapping bookings, including a period with no `neededCount`;
- a booking refused for overlapping another booking, and for overlapping the volunteer's own talk;
- self-registration: mail sent, token accepted once, second booking without a mail;
- a name matching a nickname answered with `useForumLogin`;
- reminder selection at a fixed clock reading, and the stamps preventing a second send;
- cleanup removing bookings and volunteer-only accounts while leaving exhibitors alone.

## Implementation plan

Nine steps, each one commit, each leaving the tree green under `pnpm lint`, `pnpm test` and
`pnpm prettier -c` — the pre-commit hook runs all three.

Two generation loops run throughout: `cd backend && npm run generate` after every change to a
`.graphql` file, and `cd frontend && npm run generate` before the frontend uses a new field.
`pnpm dev` runs the schema watcher that does the first of these automatically.

### 1. Entities, migration, wiring

- `backend/src/modules/volunteer/entity.ts` — `VolunteerActivity`, `VolunteerPeriod`,
  `VolunteerBooking` as described above.
- `backend/src/modules/volunteer/repository.ts` — `VolunteerRepository` extending
  `EntityRepository<VolunteerActivity>`, empty for now.
- `User.emailVerifiedAt` in `modules/user/entity.ts`.
- Export the three entities from `src/entities.ts`; add `volunteer: VolunteerRepository` to
  `Services` in `src/db.ts` and to both service constructors there.
- Hand-written migration `src/migrations/Migration<stamp>_volunteer_shifts.ts` in the style of
  `Migration20260813120000_serial_tokens.ts`: three tables, foreign keys, an index on
  `volunteer_booking.start_time`, the `user.email_verified_at` column, and
  `update "user" set "email_verified_at" = "created_at"` so that every account that exists today
  counts as verified.

**Done when** `npm run make-demo-db` builds a fresh database and `npm run lint` (which runs
`tsc -b`) passes.

### 2. Coverage arithmetic

- `backend/src/modules/volunteer/coverage.ts` — a pure function over plain values:

  ```ts
  computeCoverage(
    period: { startTime: Date; durationMinutes: number; neededCount?: number },
    bookings: { startTime: Date; durationMinutes: number; confirmed: boolean }[],
  ): CoverageSpan[]
  ```

  It cuts the period at every booking boundary, counts the bookings covering each span, and labels
  it `none` / `under` / `met` / `over` / `unlimited`. Adjacent spans with the same counts are merged
  so that the calendar draws one block rather than twenty.

- `backend/src/modules/volunteer/coverage.test.ts` — a plain Vitest file, no database: disjoint
  bookings, nested and partially overlapping ones, a booking flush against each end of the period, a
  period with `neededCount` unset, unconfirmed bookings counted separately.

**Done when** `npx vitest run src/modules/volunteer/coverage.test.ts` passes. Doing this before the
resolvers keeps the one piece of real arithmetic testable without a server.

### 3. Reading the plan over GraphQL

- `backend/src/modules/volunteer/schema.graphql` — the types and the three queries from the schema
  above.
- `backend/src/modules/volunteer/resolvers.ts` — `getVolunteerActivities`, `getVolunteerActivity`,
  the `coverage` and `endTime` field resolvers, `description` returning
  `activity.description?.html ?? ''` the way `conferenceSession` does, and `bookings` returning
  `name: null` when `user` is absent from the context.
- Register `volunteerResolvers` in `src/resolvers.ts`.
- `backend/src/modules/volunteer/test.ts` — a `graphqlTest` suite in the style of
  `modules/host/test.ts`: an anonymous caller reads coverage but no names, a logged-in one reads
  both.

### 4. Administering activities and periods

- The six admin mutations, each opening with `requireAdmin(user, exhibition)` and
  `requireNotFrozen(exhibition)` as `conferenceSession` and `page` do.
- `db.document.ensureDocument` for the long description, following
  `modules/conferenceSession/resolvers.ts`.
- A period is refused when its duration is not positive or when `neededCount` is below one, and an
  activity key that is not a slug or already taken in this exhibition is refused as well —
  `BadRequestError` and `UniqueConstraintError` with German messages.
- An activity or period that people have signed up for is not deleted: the answer names how many
  shifts stand in the way, and they are cancelled first.
- Tests for the guards and for the description round trip.

### 5. Booking, self-registration, verification

- `modules/volunteer/booking.ts` — `bookSlot(db, user, input)` holding the rules in one place:
  15-minute alignment, containment in the period, overlap against the user's other bookings, and
  overlap against `ConferenceSession` rows the user is listed on through `Exhibitor`. Each refusal
  is a `BadRequestError` naming what is in the way.
- `modules/volunteer/identity.ts` — the self-registration path: the local collision check against
  `User.nickname`, `User.fullName` and `User.email`, the remote nickname check behind
  `FORUM_NICKNAME_API_URL` (skipped while unset), and the creation of the passwordless account with
  a token from `db.user.createPasswordResetToken`.
- Mutations `bookVolunteerSlot`, `registerVolunteer`, `confirmVolunteerEmail`,
  `cancelVolunteerBooking`. `confirmVolunteerEmail` sets `emailVerifiedAt`, sets `session.userId` as
  `login` does, and refuses a token whose account has since gained a password or a nickname.
- `modules/volunteer/emails.tsx` — the verification mail (with the `/auth/forum?registrationToken=…`
  button), the booking confirmation, and the cancellation notice to the activity contact.
- Tests: overlap refused, own talk refused, a name matching a nickname answered with
  `useForumLogin`, first booking mails a token, second booking after verification mails nothing,
  cancellation inside 24 hours notifying the contact.

### 6. Reminder job and cleanup

- `backend/src/app/volunteerReminders.ts` beside `app/cleanup.ts`, same shape: an exported
  `runVolunteerReminders(now: Date)` holding the work, wrapped in `RequestContext.create`, and a
  `startVolunteerReminderScheduler()` on `cron.schedule('*/15 * * * *', …)`. Passing `now` in is
  what makes the job testable at a fixed clock reading.
  - the 20:00 run mails one digest per user with bookings the next day and stamps `digestSentAt`;
  - every run mails the short reminder for bookings starting in 60 to 75 minutes and stamps
    `reminderSentAt`;
  - every run deletes accounts unverified for more than 48 hours, and their bookings.
- Start it next to `startCleanupScheduler()` in `src/app.ts`.
- Extend `performCleanup` in `app/cleanup.ts`: delete the exhibition's bookings, then the users with
  no password, no nickname, no exhibitor record and no remaining bookings.
- Tests calling `runVolunteerReminders` at fixed readings, asserting that a second call at the same
  reading mails nothing, and a cleanup test that leaves exhibitors untouched.

### 7. Administration pages

- `frontend/src/pages/admin/VolunteerActivities.tsx` — `DataTable` of activities with their period
  counts and coverage state.
- `frontend/src/pages/admin/VolunteerActivityEditor.tsx` — name, summary, contact
  (`ExhibitorSelector`), description (`TextEditor`), and the periods with `DaySelector`,
  `TimeSelector`, `DurationSelector` and the needed count.
- `frontend/src/pages/admin/VolunteerCoverage.tsx` — the gap report, soonest first.
- Routes under `/admin` in `routes.tsx`, an entry in the Administration dropdown of `NavBar.tsx`.

### 8. Public pages

- `frontend/src/components/volunteer/VolunteerCalendar.tsx` — day columns, activity lanes, coverage
  blocks, built on the time-axis arithmetic of `components/schedule/MultiDayScheduleGrid` without
  its drag-and-drop; `useIsMobile` switches to a one-day view with `DaySelector`, following
  `MobileScheduleList`.
- `frontend/src/pages/volunteer/Mitmachen.tsx` — calendar plus the activity list with the disclosure
  over `ServerHtmlContent`.
- `frontend/src/pages/volunteer/Activity.tsx`, `MyShifts.tsx`, `ConfirmEmail.tsx`, and the sign-up
  dialog with the name/email fields for a caller who is not logged in.
- Routes in `routes.tsx` inside `MainLayout` and outside `ProtectedRoute`; a public **Mitmachen**
  entry in `NavBar.tsx`.
- Every mutation call site reads `result.errors` and shows the message, per the error-handling rule
  in `CLAUDE.md`.

### 9. Demo data and the calendar export

- `src/seeders/DemoSeeder.ts` — the three activities with their periods and a handful of bookings,
  so that the calendar has something to draw locally.
- `GET /api/volunteer/shifts.ics` for the signed-in volunteer, built with `generateICalContent` from
  `modules/schedule/ical.ts`, linked from **Meine Schichten**.

### Afterwards

The forum nickname endpoint is wired in as soon as it exists on forum.classic-computing.de: a
function in `identity.ts`, two environment variables, and one test.
