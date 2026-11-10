# TISC Testing

A free web app for the Toronto Island Sailing Club (TISC) that replaces the paper testing sheets in
`2026 TISC Handbook - FORMS.docx` (v1.3, 3 May 2026). Examiners sign off requirements online, and members
can see their history and how far along they are toward their next rating.

> This is a **proof of concept**. See [Known gaps](#known-gaps--next-steps).

## Background / context

Members progress through ratings by passing tests. Today each test is a paper sheet made of sections
(Sailing Skills, Boat Maintenance, Club Knowledge & Safety, Boat Knowledge, ...). Each line item is signed and
dated by an examiner. When every item is signed, the final tester signs the sheet and emails
`TestComplete@torontosailing.com`.

### Ratings and progression

```
Novice ──(Helms test)──▶ Helms ──(Senior Helms test)──▶ Sr. Helms ──(Skipper test)──▶ Skipper
                            │                               │
                            └── Hobie Wave / Laser ◀────────┘   (endorsements, not ranks)
```

- **Rank** is one of: Novice, Helms, Sr. Helms, Skipper. It only goes up through the tests above.
- **Endorsements** (Hobie, Laser) are extra rights earned by their own tests. They are independent of rank.
  - Helms and Sr. Helms can earn Hobie or Laser. Skippers have no further progression in this app.
  - The handbook also has a **Laser-Only Helms** sheet: a full sheet for members who only want Laser rights
    (it grants the Laser endorsement without a rank change). It's included, so novices have a Laser path.
- Per the sheets, the Hobie sheet covers the **Hobie Wave** only; the Getaway is skippers-only.

### Tests (all taken from the 2026 forms)

| Test key       | Sheet                  | Prerequisite            | Grants                 | Items |
|----------------|------------------------|-------------------------|------------------------|-------|
| `helms`        | Helms                  | Novice                  | rank → Helms           | 20    |
| `sr_helms`     | Senior Helms           | Helms                   | rank → Sr. Helms       | 9    |
| `skipper`      | Skipper                | Sr. Helms               | rank → Skipper         | 26    |
| `laser`        | Laser Helms            | Helms or above          | Laser endorsement      | 3     |
| `laser_only`   | Laser-Only Helms       | none                    | Laser endorsement      | 16    |
| `hobie`        | Hobie Wave Helms       | Helms or above          | Hobie endorsement      | 6     |

Item counts include the PREREQUISITE rows and are checked in `tests/logic.test.ts`. The sheets are transcribed
**verbatim** (wording, ✭/②/③/🅕 notes, Min Base Wind, PREREQUISITE rows, final-tester footer) and rendered in the
same layout as the paper form. The PREREQUISITE row is signed like any other line, and the app *also* enforces
eligibility. On the Hobie sheet, "Leaves from and returns to beach" and "Understands/can explain specifics of
Hobie sailing" share one signature box, as on paper.

### Who can do what

| User type              | Can administer (sign off)                  | Can see                                   |
|------------------------|--------------------------------------------|-------------------------------------------|
| Website administrator  | everything, **plus** manage users & roles  | everything                                |
| Testing committee      | any test; **edit the testing sheets**      | all members and their sheets              |
| Skipper                | **Helms** test only                        | all members and their sheets              |
| Helms / Sr. Helms      | nothing                                    | own history and progress                  |
| Novice                 | nothing                                    | own history and progress                  |

Two independent properties on a user make this work: `role` (`admin` / `committee` / `member`) and `rank`
(novice / helms / sr_helms / skipper). A skipper who is on the testing committee gets the union of both.
Rules enforced server-side: nobody can sign off (or remove sign-offs from) their own sheet; logins lock for 15
minutes after 5 failures per email (30 per IP); only the examiner who signed an item (or the
committee/admin) can remove a sign-off.

The "who may administer what" matrix lives in one place (`src/lib/permissions.ts`) so the club can change it.

## How a test works in the app

1. An examiner opens a member, picks a test, and ticks off line items. Each tick records the examiner and a
   timestamp (replacing "Examiner signature & date"). A note can be attached (e.g. a conditional capsize pass).
2. The sheet's **credit** option records automatic credits (Cansail ②/③, Fast Track 🅕) instead of an exam.
3. When every item is signed, the examiner presses **Complete test**. That records the final tester and date and
   applies the promotion/endorsement. The page shows the reminder to notify `TestComplete@torontosailing.com`.
4. Members see completed tests, signed items with examiner and date, and a progress bar toward each test they're
   eligible for.

### Editing the sheets (testing committee)

**Testing sheets** in the nav lets committee members (and admins) edit a sheet's content: title, Min Base Wind, top
notes, sections, items, bullet text and automatic-credit markers. They can also add, remove and reorder items. Each
save is a new revision (`2026 rev N`) with history, and **Restore handbook version** goes back to the 2026 text.

- The handbook text in `src/lib/tests.ts` is the default. A committee edit is stored in the `test_sheets` table.
- Rewording an item keeps its sign-offs. Deleting an item means its sign-offs no longer count. Completed tests
  aren't affected, and each completion records the sheet revision it was taken against.
- **Not editable:** who is eligible for a sheet and what it grants. Those are the club's progression rules and live
  in code, so a sheet edit can't break promotions.
- Detail-line conventions in the editor: a plain line is a bullet; `> text` is a plain line; `## TEXT` is a
  sub-heading in the same signature box.

Future online-administered tests (e.g. knowledge quizzes) can attach to the same item keys.

## Tech choices

- **Next.js (App Router) + TypeScript** deployed on **Vercel**.
- **Neon Postgres** (free tier) for storage. I picked Neon over MongoDB Atlas because the data is relational
  (users → sign-offs → tests) and because **Atlas free M0 clusters are paused after ~60 days of inactivity**,
  whereas a Neon free database only suspends *compute* when idle (wakes in about a second). Your data is never
  deleted for inactivity. A sailing club is idle all winter, so this matters.
- `pg` driver (works with Neon's pooled connection string and with any local Postgres for development).
- Auth: email + password (`bcryptjs`), session in a signed httpOnly cookie (`jose`). No external auth service.
  Roles are read from the DB on every request, so role changes apply immediately.

## Running locally

```bash
npm install
cp .env.example .env.local      # DATABASE_URL + SESSION_SECRET
npm run dev                     # http://localhost:3000 → first visit goes to /setup
npm test                        # unit tests: sheet definitions, editing, progress, permissions
npm run e2e                     # browser walkthrough; needs a FRESH db and the app on :3100 (see CI)
```

Any Postgres works locally, e.g. `postgres://postgres:postgres@localhost:5432/tisc`.

## Deploying (all free)

Environment variables are documented in [`.env.example`](.env.example).

1. **Neon via Vercel Marketplace** (Vercel → Storage). This sets `DATABASE_URL` automatically.
2. **Vercel env vars**: add `SESSION_SECRET` (`openssl rand -hex 32`). `ALLOW_SIGNUP=true` is optional.
3. Deploy (Vercel builds every push to `main`). The tables are created automatically on first request.
4. Visit the site. With no admin yet it opens **/setup**. Create the first admin with the club's admin email
   (`ADMIN_EMAIL`, default `commodore@torontosailing.com`) and the **setup code**: the `SESSION_SECRET` value
   (or `SETUP_TOKEN` if you set one). The page closes once an admin exists.
5. Create members at **Users**, and set the rating of anyone who already passed on paper.

## CI

`.github/workflows/ci.yml` runs on every push and PR: typecheck, unit tests, production build, then the e2e
walkthrough (`tests/e2e.mjs`) against a real Postgres 17 service with headless Chrome. The walkthrough covers setup,
user creation, novice/skipper/committee permissions, signing, credits, completion and promotion, and sheet editing.
Screenshots are uploaded as a build artifact.

## Project layout

```
src/lib/schema.ts        tables (applied automatically, idempotent)
src/lib/tests.ts         the six 2026 sheets, verbatim, + progression rules
src/lib/sheets.ts        current sheet = rules + committee edits (DB) or handbook default
src/lib/sheet-validate.ts  validation of edited sheets
src/lib/progress.ts      progress + completion logic
src/lib/permissions.ts   who can administer what
src/lib/db.ts, auth.ts   Postgres pool; sessions
src/app/                 pages and server actions
tests/                   unit tests (vitest) + e2e walkthrough
```

## Known gaps / next steps

- Tested against Postgres 17 locally and in CI. On Vercel it uses Neon's pooled connection.
- No email notifications. The sheets ask for an email to `TestComplete@torontosailing.com`; this could be sent
  automatically on completion (e.g. Resend free tier).
- No password reset by email (an admin can set a new password). Users can't change their own password yet.
- Imports: members are created by hand; a CSV import from the membership list would help.
- Rank/endorsement changes by an admin are allowed directly (to bring in existing members who passed on paper).
- Skippers may administer only the Helms test, per the stated rules. Whether they may also do Senior Helms is a
  one-line change in `src/lib/permissions.ts`.
- Seasonal expiry (e.g. lapsed membership, repairs carrying across seasons) is not modelled.
- `npm audit` reports a PostCSS advisory inside Next 15's build tooling (not reachable at runtime). The fix is
  Next 16.
- The Smartwaiver forms, guest waivers, incident reports and Water Safety Checklist in the handbook are out of scope.
