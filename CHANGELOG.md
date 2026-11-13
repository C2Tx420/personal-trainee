# Changelog

All notable changes to **Personal Trainee**. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

The app ships continuously, so releases are named by date. Each one matches an entry in the in-app "Có gì mới" page (`src/app/whats-new.ts`), which has the user-facing notes in Vietnamese. **Plan** is the design doc version; **migration** is the newest file the release needs.

| Release | Highlights | Plan | Migration |
|---|---|---|---|
| [Unreleased](#unreleased) | Public repo: sample seed, README, MIT license | v2.8 | `20261108000100` |
| [2026-11-13](#2026-11-13--flexible-sessions) | Swap sessions on any day | v2.8 | `20261108000100` |
| [2026-11-08](#2026-11-08--friday-upper-day) | 4th gym day, `db:migrate` | v2.8 | `20261108000100` |
| [2026-11-06](#2026-11-06--smarter-coaching) | English names, assisted machines, draft checks | v2.7 | `20261106000400` |
| [2026-11-02](#2026-11-02--weekly-plans-and-reflections) | Plans by week, reflections, forced update | v2.6 | `20261102000100` |
| [2026-10-28](#2026-10-28--lb-stacks-and-records) | lb pin stacks, personal records, "Có gì mới" | v2.6 | `20261027000900` |
| [2026-10-27](#2026-10-27--first-release) | Rebuild as a React PWA + Supabase | v2.5 | `20261027000900` |

---

## Unreleased

### Changed
- **Personal data out of the repo.** The seed profile, goals and InBody are sample values; the hosted DB keeps the real ones (`0600` already ran there). The coach's profile and one-off notes moved to the gitignored `coach/CLAUDE.local.md`.
- **Goal line from the first weigh-in.** The weight chart and the Today goal bar start from the first logged weight instead of a hard-coded value; kcal estimates before any weigh-in use `DEFAULT_BODY_WEIGHT_KG` (70).
- **README for a public repo.** Screenshots in `.github/screenshots/` (from the e2e run on sample data), measured test / Lighthouse / bundle numbers, local and hosted setup, the coach workflow. MIT `LICENSE`.
- **Editor and agent settings untracked.** `.claude/` and `.vscode/` are now gitignored.

### Fixed
- **e2e caught up** with the lb-stack lat pulldown (35 → 32, one pin down; coach draft on the 18 / 23 / 27 / 32 ladder) and the 2026-11-13 "Có gì mới" release.

---

## 2026-11-13 · Flexible sessions

### Added
- **Swap sessions on any day** (`LiftSwap` on Today; `scheduledKindOn`, `scheduledOpenOn`, `replacedNote`, `liftOptionsFor` in `schedule.ts`).
  - Lifting day: "Đổi sang buổi khác". Badminton day: cardio or any lifting session. Rest day and Sunday: "Vẫn muốn tập tạ" / "Buổi tạ khác".
  - Picking one logs the scheduled session as skipped ("Đổi sang …" / "Không đánh — thay bằng …") and starts the live workout.
  - Legs is left out on Sunday and next to badminton (logged, or scheduled after today).
  - Backfill offers the same swap for the date's open scheduled session; the simple-session page takes `?ngay=` and records the badminton skip on save for that date.

### Fixed
- **Date inputs on iOS Safari** no longer spill over the field next to them in two-column forms (Cơ thể, Ghi bù, InBody): `min-w-0` on `Field` / `Input`, `appearance: none` on date inputs.

---

## 2026-11-08 · Friday Upper day

### Added
- **4 gym days** (plan v2.8). New template key / session kind `upper` ("Thân trên", meant for Friday) in `TEMPLATE_KEYS` and `SESSION_KINDS`; migration `20261108000100` widens the `session_templates.key` and `workout_sessions.kind` checks.
  - `templateKeyOf(kind)` maps a session kind to its template (`push_light` → `push`) instead of guessing from the name.
  - Quick log reads "thân trên" / "upper".
  - Older app builds can't parse a plan with `upper`: update the app before approving one. `MIN_SCHEMA_VERSION` = `20261108000100`.
- **`pnpm run db:migrate`** (`scripts/db-migrate.sh`, `DB_URL` from the environment): applies migrations newer than `app_meta.schema_version` with psql, one transaction per file. Stops at the first error and at the first migration dated after today (`MIGRATE_ALLOW_FUTURE=1` overrides). Records each file in `supabase_migrations.schema_migrations` so `supabase db push` won't re-run it. `--dry-run` lists what would run.

### Changed
- **Badminton is an active rest day.** Weekly summary: planned sessions = gym days only, done sessions = lifting sessions (light Push / Pull included); badminton is counted only in `badmintonSessions`. Same numbers in the coach report (`planned_sessions`, `done_sessions`).
- **Lat pulldown stations renamed** (cable vs Matrix); the cable stack is an lb stack.
- **Migration renumbered.** The `name_vi` drop moved from `20261113000100` to `20261106000400` so it runs before `20261108000100` (`db:migrate` had skipped it because production was already past it).

---

## 2026-11-06 · Smarter coaching

### Added
- **Assisted machines** (`exercises.is_assisted`, migration `20261106000100`; seed `assisted_pull_up`, `assisted_dip`): lower kg = harder.
  - One direction helper (`src/engine/load.ts`) drives personal records, strength progress, the top-set chart, "↑ hơn lần trước", the progression hint and the plan-review ↑ / ↓.
  - Volume counts body weight − assistance; `pct` warm-ups are dropped.
  - Toggle "Máy trợ lực" on the exercise page; the weekly report adds `sets_detail_4w[].is_assisted`.
- **"So với lần trước" card** on the session summary and detail: one ↑ / = / ↓ per working set vs the same set last session (`setTrend` in `analytics.ts`).
- **Typo guard** (`suspiciousSet`): kg > 1.5× or < 0.4× the heaviest working set ever, reps > 2× the target max (and > 20), or a kg between two pins on an lb stack. The set card asks once on "Xong hiệp"; Quick log and Backfill show a warning. Never blocks.
- **Back-off sets** (`backoff_steps`, 0–2): working sets 2+ are that many steps lighter than set 1, so raising `target_kg` carries them. Not allowed together with `target_kg_per_set`.
- **Sets per muscle** (`muscleSets` / `weeklyMuscleSets`; primary +1, secondary +0.5): "Hiệp theo nhóm cơ" card on the Training tab with a 10–20 reference band, and `training.muscle_sets` in the weekly report.
- **e1RM and stall count** (Epley, ≤ 15 reps; `stallCount` = sessions in a row stuck at the same load). Report adds `e1rm_by_session`, `stall_sessions`, `training.stalled`; the Training chart gets a Tạ / e1RM switch.
- **Deload options** (`deloadOptions`): choices on the real load grid at ~90% of the recent best e1RM, in `training.stalled[].deload_options`.
- **"Bỏ buổi" reminder** (`missed_workout`, migration `20261106000200`; default 21:00): on a lifting day with nothing logged, never after 22:30, quiet after 3 missed lifting days in a row. Generic text, no numbers.

### Changed
- **English exercise names** for all 53 seed exercises ("Machine Chest Press", "Cable Lat Pulldown"); the Vietnamese name moves to `aliases`, so search, substitute and quick log still match it. Migration `20261105000100` renames rows still on the seed name.
- **Column `name` replaces `name_vi`** in two releases: `20261106000300` adds `name` with a sync trigger, `20261106000400` drops the trigger and `name_vi`. Drafts and backups that still carry `name_vi` are read as `name`.
- **Stricter draft checks** (`src/engine/draft-validate.ts`). Errors: a new load off the lb ladder, an exercise twice in one session, a fixed warm-up ≥ the working load. Warnings: > 1 step vs the active plan, > 6 changes, more load where "đau" was noted, an off-ladder load copied unchanged. `submit-draft` needs `--accept-warnings`.
- **Stale drafts** (`draftWarnings`): the review screen warns when a draft was built on a plan that is no longer active, and when several are pending ("Từ chối bản cũ"). `submit-draft` refuses while one is pending unless `--allow-pending`.
- **Lighter ramp warm-ups**: always ≥ 1 step below the working load (`capBelow`); default compound warm-up 50% × 8 + 75% × 4 (`suggestWarmup`).
- **Coach judgement rules** in `coach/CLAUDE.md` (one session is not a trend, "giữ nguyên" is valid, ≤ ~6 changes, reasons in gym terms); `rejected_recent[]` adds `rejected_reason` and `changes`.
- **e2e only against local Supabase**: `scripts/e2e.ts` passes the local URL + anon key, and `playwright.config.ts` refuses anything else.

---

## 2026-11-02 · Weekly plans and reflections

### Added
- **Post-workout reflection** ("Cảm nhận sau buổi"): optional text on the summary, editable on the session detail until that week has a coach review, then read-only (DB trigger `workout_sessions_reflection_guard`, migration `20261102000100`). The coach report gets `sessions[].reflection`.
- **Light sessions on rest days** (walk / zone 2 / core; only walk / core the day before Legs). Badminton day: "Thay bằng Zone 2 / Đi bộ" marks badminton skipped and opens the substitute log.
- **Plans named by training week** ("Tuần 2 · Noel"): each goal is a phase and the week count restarts at each goal (`plan-week.ts`).
- **Plan review screen**: changes grouped per session (new / replaced exercises, ↑ / ↓ badges, coach note, unchanged dimmed, removed struck through), a summary row and the coach's reasons as bullets.
- **Coach notes as cards**: headline, sections with icons, ✓ / ⚠ bullets, a highlighted "Cần anh trả lời" box, link to the week's plan.

### Changed
- **Coach guide**: machines are the backbone with exactly 1 free-weight compound per session; new review-note format; the review runs only on Monday after the weigh-in.
- **`hack_squat`** is available at the gym again.

### Fixed
- **App updates are one global guard** instead of a per-screen toast. A waiting release installs before login / PIN or on the next screen change, never inside the workout flow; releases are identified by build (commit + build time).
- **Forced update really locks**: opening or resuming the app compares `/version.json` with the running build; a reload-loop guard stops after 2 attempts.
- **No PIN-screen swap mid-entry**: login / PIN wait (≤ 3 s) for the first version check; a release that failed to install twice no longer reloads the app on every launch.
- **e2e setup** waits for auth after `supabase db reset` instead of failing on a 502.

---

## 2026-10-28 · lb stacks and records

### Added
- **lb pin stacks** (`load_step_kg` 4.5): −/+ go pin to pin, one-tap pin chips (40 lb · 18 kg …), loads logged as whole kg (18 / 23 / 27 / 32 / 36). Switch "Máy chia nấc lb" on the exercise page.
- **Personal records**: 🏆 on the set and a "Kỷ lục mới" card on the summary and session detail.
- **Progress card** on Today: weekly-average weight, waist, and first vs latest top set of up to 4 lifts.
- **Last time on every set** ("Lần trước: 27×12 · vừa") with a "Lặp lại" button.
- **Photo overlay** of the last progress photo: Tắt / Mờ / Rõ.
- **"Có gì mới"**: Vietnamese release notes on their own page, shown once after an update (never during a workout).
- **Reminder prompt** on first run; on iPhone outside the home-screen app, "Thêm vào MH chính" steps instead. Silent re-subscribe when permission exists but the subscription is gone.
- **Forced update**: a waiting release installs before login / PIN; checks every 30 minutes and on return to the foreground.

### Fixed
- **e2e no longer depends on the day it runs**: the browser clock is fixed to Tue 2026-10-27.

---

## 2026-10-27 · First release

### Added
- **Complete rebuild** as a React PWA (Vite) + Supabase, replacing the old Expo app.
- **Sign-in** (single account) + 4-digit PIN on every open, verified server-side (secret `APP_PIN`); 5 wrong attempts → sign in again.
- **Today**: scheduled session, warm-up, goal countdown, banners for pending drafts, coach notes and the Legs–badminton warning. "Nghỉ buổi này" with a reason, shown in history and the coach report (`skipped_days`).
- **Guided workout**: timed warm-up → each exercise, each set (kg / reps / effort / note) → rest → summary; log the actual kg with a reason; free-text swap (provisional exercise); do later / skip; resume after interruption.
- **Logging**: backfill, free-text quick log, badminton / walk / zone 2 / core.
- **Exercise library** with SVG illustrations and technique cues: compound free weights (DB bench, overhead press, Bulgarian split squat, lunge, deadlift, hip thrust) and 9 Matrix machines (leg extension, hip abduction / adduction, lateral raise, lat pulldown, seated dip, assisted dip, ab crunch, rotary torso), 53 in total.
- **Body**: weight, measurements, charts, goal line, 2-week plateau warning; InBody; private progress photos (EXIF stripped, 1080 px, signed URLs).
- **Versioned plans**: diff, approve (today or a scheduled date), reject, self-edit → new version.
- **Web Push reminders**, JSON backup / import, and `coach/` for Claude Code's Monday review.
- **Dark theme** with a single accent color and an SVG icon set; dark launch splash with no white flash; skeleton cards while loading.
- **Seed**: profile, 3 goals, InBody, plan v1 (week 1, machines first), one backfilled Push session.

### Changed
- **Renamed to Personal Trainee** (manifest, home-screen title, login, notifications).
- **Faster start**: every screen except Today is lazily loaded; after the first launch, bootstrap runs in the background.
- **Measurements form** asks only for the main five: waist (navel), hip, chest, upper arm, thigh.
- **`lat_pulldown`** is the cable station ("Kéo xô cáp"); the lat pulldown machine is its own exercise.

### Fixed
- **Notch / Dynamic Island iPhones**: the page header, "resume workout" banner and offline bar respect the safe area.
- **Exercise swap**: typing the name of the exercise being swapped no longer creates a provisional duplicate.
