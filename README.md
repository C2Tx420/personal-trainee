# Personal Trainee

A single-user PWA for strength training and body recomposition. It runs a fixed Push / Pull / Legs + Upper + badminton week, with a **guided workout flow** (warm-up → each exercise, each set → rest timer → summary), body weight, measurements, InBody scans and private progress photos.

Every Monday **Claude Code acts as the coach**: it reads the week through a read-only Postgres role, writes a review note and submits next week's plan as a **draft**. Nothing changes until the user approves it in the app.

Mobile-first · dark theme · online-only (no health data cached on the device).

<table>
  <tr>
    <td><img src=".github/screenshots/today.png" width="260" alt="Today: goal countdown and today's Pull session"></td>
    <td><img src=".github/screenshots/set.png" width="260" alt="Logging a warm-up set"></td>
    <td><img src=".github/screenshots/rest.png" width="260" alt="Full-screen rest timer"></td>
  </tr>
  <tr>
    <td align="center">Today: goal and session</td>
    <td align="center">Logging a set</td>
    <td align="center">Rest timer</td>
  </tr>
  <tr>
    <td><img src=".github/screenshots/summary.png" width="260" alt="Session summary"></td>
    <td><img src=".github/screenshots/training.png" width="260" alt="Training week and sets per muscle"></td>
    <td><img src=".github/screenshots/exercise.png" width="260" alt="Exercise page with illustration and cues"></td>
  </tr>
  <tr>
    <td align="center">Session summary</td>
    <td align="center">Week + sets per muscle</td>
    <td align="center">Exercise library</td>
  </tr>
  <tr>
    <td><img src=".github/screenshots/body.png" width="260" alt="Body: weight log"></td>
    <td><img src=".github/screenshots/plan-review.png" width="260" alt="Approving the coach's plan draft"></td>
    <td><img src=".github/screenshots/coach-review.png" width="260" alt="Weekly coach review note"></td>
  </tr>
  <tr>
    <td align="center">Body weight</td>
    <td align="center">Approve the coach's draft</td>
    <td align="center">Weekly coach review</td>
  </tr>
</table>

<sub>Screenshots come from the Playwright run against a local Supabase with sample seed data. Content written by the user or the coach (exercise cues, coach notes) is shown as it was written.</sub>

## Features

- **Guided workout**: warm-up timer and mobility checklist, per-exercise intro (SVG illustration, target, coach note), big −/+ controls, effort tap (Light / Moderate / Hard), rest timer, resume after reload, swap a busy machine or type a new one on the spot.
- **Equipment-aware loads**: kg steps or lb pin stacks (18 / 23 / 27 / 32 / 36 kg…), plates per side, assisted machines where less weight is harder.
- **Training log**: weekly view, sets per muscle, top-set and volume trends, personal records. Quick log from free text ("3 set x 12 40kg"), backfill and swapping sessions on any day.
- **Body**: weight trend against the goal line, measurements and WHR, InBody scans, progress photos (EXIF stripped, private bucket, short-lived signed URLs).
- **Goals**: dated milestones with the required weekly rate. Loss faster than 0.7 kg/week gets flagged.
- **Coach loop**: a weekly report → plan draft with reasons → a diff screen to approve or reject → the review note shows in the app.
- **Reminders**: Web Push for weigh-in, measurements, progress photos, InBody, workout, missed workout, weekly review and goal milestones, sent by an Edge Function on pg_cron.
- **Language**: switch the interface language under More → Language; dates and numbers follow it.
- **Safety**: PIN lock on open, one account (sign-up disabled), hard rules enforced in the DB and the app: reference calories ≥ 1,700, Legs never next to badminton, no Legs on Sunday.

## Your data and your progress

The app is built to run on real numbers from day one and to show, week by week, whether they are moving the right way.

### Getting your data in

| What | How |
|---|---|
| **Profile, goals, starting InBody** | Edit the sample values in `scripts/build-seed.ts`, run `pnpm run seed:build`, then sign in for the first time: the seed is copied into your account once. There is no in-app editor for these yet. |
| **Workouts as they happen** | The guided flow logs every set: kg, reps or seconds, effort, a note, and the reason when you lift something other than planned (too heavy, machine busy…). |
| **Past workouts** | "Log past session" fills a session from the plan for any date. "Quick log" turns a pasted gym note into exercises and sets that you check before saving. |
| **Body** | Weigh-ins (any day, best on a weekly morning), the five main measurements (waist, hips, chest, upper arm, thigh), InBody scans (weight, skeletal muscle, body fat %, visceral fat, fat-free mass, BMR, score) and progress photos by angle. |
| **Another device or a fresh install** | More → Backup exports everything as one JSON file (`pt-backup/1`) and imports it back. Photos are left out by default. |

### Following the improvement

| Question | Where the app answers it |
|---|---|
| Am I getting stronger? | After every workout, each working set gets ↑ / = / ↓ against the same set last time, and new personal records get a 🏆. The Training tab charts the top set or estimated 1RM per exercise. Today's **progress card** compares the first and latest top set of up to four lifts since the program started: more reps at the same load, or more load. |
| When do I add weight? | When every working set reaches the top of the rep range without a Hard set, next week's plan raises the target one step: one pin on an lb stack, less help on an assisted machine. For exercises where you pick the load yourself, the set screen suggests that step directly. Two stalled sessions in a row are flagged in the weekly report, with lighter options on the real load grid. |
| Is my weight on track? | The Body tab shows the weekly average against a goal line drawn from your first weigh-in to each goal date. Today shows the active goal with the required kg per week and whether you are on track. A loss rate outside 0.5–0.7 kg/week is called out. Two flat weeks bring practical suggestions and a one-tap calorie draft (never below 1,700 kcal). |
| Is it fat or muscle? | Each InBody scan is compared with the previous one (muscle, fat %, visceral fat, fat-free mass). The goal card estimates body fat from your last fat-free mass. Waist and waist-to-hip ratio are tracked across measurements. |
| Does it show? | Progress photos from the same angle, side by side or with an overlay slider. |
| Am I training enough? | Sets per muscle group each week, against a 10–20 set reference band and your average over the previous four weeks, plus warm-up completion. |

Every Monday the coach report pulls these same numbers together: load trend and stalls per exercise, sets per muscle, weight trend, notes about pain or busy machines. Next week's plan is proposed from them, with a reason for each change.

### How one lift moves forward

An illustration of the rules (not real data), for a machine with a 10–12 rep range on an lb stack:

1. **Calibration week**: no target yet; you pick the load and log what you did.
2. **Target set**: the plan sets 27 kg × 3 sets of 10–12.
3. **Range reached**: 27 kg × 12, 12, 12 without a Hard set → the next weekly plan raises the target to 32 kg (one pin).
4. **New load**: 32 kg × 10, 9, 8 → stay at 32 kg until all sets reach 12.
5. **Stalled**: two sessions with no more reps at 32 kg → the report offers a lighter option on the pin ladder (e.g. 27 kg × 12), and the coach decides.

## Quality

Measured on 14/11/2026 at commit time.

| Check | Result |
|---|---|
| Unit tests (Vitest: engine, i18n coverage) | **113 / 113** passing |
| Database tests (pgTAP: bootstrap, constraints, RLS, coach role) | **55 / 55** passing |
| End-to-end (Playwright, local Supabase) | **13 / 13** scenarios passing, 47 screens covered + English screenshots |
| Lighthouse mobile: Performance / Accessibility / Best Practices | **95 / 100 / 100** |
| Core Web Vitals (Lighthouse, simulated slow 4G) | LCP 2.5 s · TBT 0 ms · CLS 0 |
| Initial JS + CSS (gzip) | 223 KB |

Lighthouse was run on the sign-in screen of a production build (`vite preview`), since everything else sits behind auth.

## Stack

React 19 + Vite 8 + `vite-plugin-pwa` · TanStack Query · Tailwind CSS v4 · Recharts · Supabase (Auth, Postgres + RLS, Storage, Edge Functions, pg_cron, Vault) · Vitest · Playwright · pgTAP. Hosted on Vercel.

## Getting started

Requirements: Node 22+, pnpm, `psql`. For tests: Docker and the Supabase CLI.

### Local (everything on your machine)

```bash
pnpm install
supabase start             # local Postgres, Auth, Storage, Edge runtime
supabase db reset          # apply supabase/migrations/* (incl. sample seed)
pnpm run dev               # http://127.0.0.1:5173
```

Point `.env.local` at the local stack (`supabase status` prints the URL and anon key). Create a user in Studio (http://127.0.0.1:54323); sign-up is disabled on purpose.

### Hosted Supabase + Vercel

1. Create a Supabase project, then apply migrations in order: `DB_URL='postgresql://…' pnpm run db:migrate` (add `--dry-run` to preview). `app_meta.schema_version` is the watermark, so only newer files run.
2. Create the user in the dashboard (Auth → Users). Seed data (sample profile, goals, exercise library, plan v1) is created on first sign-in.
3. Edge Functions: `pnpm run functions:bundle` gives one file per function in `dist/functions/` to paste into the dashboard editor. Set the secrets from `supabase/functions/.env.example`: `APP_PIN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
4. Reminders: store `CRON_SECRET` in Vault as `cron_secret` and the functions base URL in `app_meta` (`functions_url`). Until both are set the cron job does nothing.
5. Frontend: deploy to Vercel with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (see `.env.example`; only public values go in `VITE_*`).

### Commands

```bash
pnpm run typecheck && pnpm run lint && pnpm test   # before every commit
pnpm run db:test                                  # pgTAP (local stack)
pnpm run e2e                                      # Playwright against the local stack only
pnpm run seed:build                               # after editing scripts/seed/* or supabase/seed/*
pnpm run svg:build && pnpm run seed:build         # after editing scripts/svg/poses.ts
```

## The coach (Claude Code)

`coach/` is a small workspace Claude Code opens every Monday. Its instructions are in [`coach/CLAUDE.md`](coach/CLAUDE.md). The user's own profile and one-off notes go in `coach/CLAUDE.local.md` (gitignored).

- **Reads** only through the `coach_readonly` Postgres role (SELECT on a fixed set of tables, no photos, no PIN). Set its password once with `alter role coach_readonly login password '…'`. The scripts take the connection string from `COACH_DATABASE_URL` or the macOS Keychain entry `pt-coach-db`, never from a file.
- **Writes** only two things through `security definer` RPCs: a plan draft (`pnpm run submit-draft`) and a review note (`pnpm run add-review-note`). Drafts are validated (load ladders, rule checks) before they reach the app.
- `pnpm run report` produces the weekly JSON report. Reports stay local in `coach/reports/` (gitignored).

## Project structure

```
src/
  engine/        pure TypeScript, unit-tested: schedule, goals, warm-up, workout flow, loads,
                 progression, plan diff, quick-log parser, weight, InBody, reminders
  data/          Supabase reads/writes + TanStack Query hooks (memory cache only)
  auth/          sign-in, PIN lock, forced update
  app/           screens: today/ workout/ training/ exercises/ body/ more/
  ui/            shared components, icons, charts
  export/        JSON backup (pt-backup/1)
  sw.ts          service worker: precached static assets + Web Push, no data caching
supabase/
  migrations/    schema, RLS, storage, RPCs, generated seed, coach role, cron (additive only)
  functions/     verify-pin, send-reminders
  seed/          53 exercises (JSON + SVG), one backfilled sample session
  tests/         pgTAP
scripts/         seed builder, SVG illustration generator, icons, migration runner, e2e runner
coach/           Claude Code instructions + report / draft / review-note scripts
e2e/             Playwright
```

## Privacy principles

- Health data lives only in Supabase. No analytics, no third-party fonts or CDNs, nothing cached on the device.
- Progress photos stay in a private bucket, resized to 1080 px with EXIF stripped before upload, shown through 60-second signed URLs, and never sent to the coach or included in the default backup.
- Plans are immutable once approved; every change is a new version. The coach can only propose.
- The seed profile, goals and InBody in this repo are sample values.

## License

[MIT](LICENSE)
