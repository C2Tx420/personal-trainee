# Changelog

Format follows Keep a Changelog, versions follow SemVer (see plan v2.4 §15).

## [Unreleased]

Plan: v2.6 · Latest migration: 20261027000900

### Added
- Rest days on the Today card offer optional light sessions (walk / zone 2 / core; only walk / core the day before Legs) — `restDayOptions` in `schedule.ts`. Badminton day: "Thay bằng Zone 2 / Đi bộ" marks badminton skipped with the reason and opens the substitute log prefilled (45–50 min, note "Thay buổi cầu lông").
- Plans are named by training week instead of version number ("Tuần 2 · Noel"): every goal is a phase and the week count restarts at each goal (`src/engine/plan-week.ts`). Plan history is grouped by phase; the coach report gets `week.reviewed` / `week.next_plan` labels.
- Plan review screen: changes grouped per session (new / replaced exercises, ↑/↓ load badges, coach note under the exercise, unchanged exercises dimmed, removed ones struck through), a summary row, a collapsible exercise-library section, and the coach's reason as a bullet list (`sessionChanges` in `plan-diff.ts`).
- Coach notes page: structured cards parsed from the note's markdown (headline, sections with icons, ✓/⚠ bullets, highlighted "Cần anh trả lời" box, link to the week's plan with its status); only the newest note is expanded (`src/engine/review-note.ts`).
- Complete rebuild as a React PWA (Vite) + Supabase, replacing the old Expo app.
- Supabase sign-in (single account) + 4-digit PIN every time the app opens, verified server-side (secret `APP_PIN`); 5 wrong attempts → sign in again.
- Today screen: scheduled session, warm-up, goal countdown, banners for pending plan drafts / coach notes / Legs–badminton warning.
- Guided workout flow: timed warm-up → each exercise, each set (kg / reps / effort / note) → rest → summary; log actual kg with a reason; free-text exercise swap (provisional exercise); do later / skip exercise; resume after interruption.
- Backfill sessions, free-text quick log, log badminton / walk / zone 2 / core.
- Library of 44 exercises with SVG illustrations + technique cues, "machine not available" flag.
- Body weight + measurements + charts + goal line + 2-week plateau warning; InBody; private progress photos (EXIF stripped, 1080px, signed URLs).
- Versioned plans: diff, approve (today / scheduled date), reject, self-edit → new version.
- Web Push reminders, JSON backup / import, coach/ for Claude Code's Monday review.
- Dark-only theme with a single accent color and an SVG icon set.
- Seed: profile, 3 goals, InBody 26/10, plan v1 (week 1, machines first), Push session 26/10/2026.
- Compound free-weight exercises: dumbbell bench press, standing barbell overhead press, Bulgarian split squat, dumbbell lunge, barbell deadlift, barbell hip thrust (with SVG illustrations).
- "Nghỉ buổi này" on the Today card for a scheduled session or badminton day: pick a reason / add a note; shown in history and in the coach's weekly report (`skipped_days`). Undo from the same card.
- Launch splash: dark static splash in `index.html`, then the same splash in React — no white flash; skeleton cards while a page loads.
- Matrix lb-stack machines (`load_step_kg` 4.5): −/+ go pin to pin, a row of one-tap pin chips (40 lb · 18 kg …), loads logged as whole kg (18 / 23 / 27 / 32 / 36); warm-up % and the "+1 step" hint land on a pin. Switch "Máy chia nấc lb" on the exercise page.
- Personal records: 🏆 on the set, "Kỷ lục mới" card on the session summary and session detail (heaviest load ever, or more reps than ever at a load done before).
- "Tiến độ từ 26/10" card on Today: weekly-average weight, waist, and first vs latest top set of up to 4 lifts.
- The set card shows the same set from last session ("Lần trước: 27×12 · vừa") with a "Lặp lại" button.
- Progress photo capture: last photo overlay can be set to Tắt / Mờ / Rõ.
- First run on a device asks to turn on reminders (sheet after "Có gì mới", never during a workout; "Để sau" asks again in a week). iPhone outside the home-screen app gets "Thêm vào MH chính" steps instead. A device that already allowed notifications but has no subscription re-subscribes quietly.
- Forced update: a waiting new release installs before the login / PIN screen. The app also checks for a release every 30 minutes and when it comes back to the foreground; inside the app the "Cập nhật" toast stays (and still waits during a workout).
- "Có gì mới": user-facing release notes in Vietnamese (`src/app/whats-new.ts`) on their own page (Thêm → Có gì mới), shown once as a sheet after an update (never during a workout), with a dot on the Thêm tab until seen. The technical CHANGELOG moved there, collapsed; About links to it.

### Changed
- Coach guide: machines are the backbone with exactly 1 free-weight compound per session; new review-note format (headline + labelled sections + ✓/⚠ bullets); review runs only on Monday after the weigh-in.
- `hack_squat` is available at the gym again (seed + coach guide).
- App renamed to **Personal Trainee** (manifest, home-screen title, login, notifications).
- Faster start: every screen except Today is a lazily loaded chunk (charts no longer in the main bundle); after the first launch on a device, bootstrap runs in the background instead of blocking the app.
- Hack squat is marked "not available" (the gym only has a Smith machine) and plank is archived. Plan v1 itself is unchanged; the coach builds the new exercise selection from the week of 02/11.
- Body measurements form asks only for the main ones: waist (navel), hip, chest, upper arm, thigh. Older entries for other measurements still show in the chart.
- Coach guidance: main lifts are compound free weights; skipped days are not failed sessions.
- `lat_pulldown` renamed "Máy kéo xô" → **"Kéo xô cáp"** (equipment: cable), matching the gym's cable station; the separate lat pulldown machine is its own exercise.
- Exercise library: 9 machine exercises for the gym's Matrix machines, with illustrations — leg extension, hip abduction, hip adduction, lateral raise machine, lat pulldown machine, seated dip, assisted dip, ab crunch machine, rotary torso (53 exercises). New muscle group "Đùi trong" (adductors). More aliases for seated cable row, chest-supported row and assisted pull-up.

### Fixed
- Force update really locks: opening or resuming the app compares `/version.json` with the running build and locks the app until the new build is installed (no longer waits for the service worker to notice it, which let him in with only a toast). Install works whether the new worker is waiting, still installing or not fetched yet; a reload-loop guard stops forcing after 2 attempts at the same build.
- App updates are one global guard instead of a per-screen toast (which kept showing on screens like Ghi bù / Bài tập): a waiting release installs before the login / PIN, or on the next screen change in the app (reload lands on that screen and keeps the app unlocked — no PIN for the app's own update reload, same tab within 60 s; never inside the workout flow). Releases are identified by build (commit + build time from `version.json`) instead of `0.1.0`; applying reloads even if another tab already activated the new worker; pages still on the old build reload when the new worker takes over; a lazy screen whose old chunk was purged reloads once.
- E2E global setup waits for auth to come back after `supabase db reset` instead of failing on a 502.
- Page header on notch / Dynamic Island iPhones (e.g. 14 Pro Max): content no longer hugs the bottom edge; the "resume workout" banner now sits under the header instead of under the status bar; offline bar respects the safe area.
- E2E no longer depends on the day it runs: the browser clock is fixed to Tue 27/10/2026 (back to real time before approving a plan, which the server checks against its own date).
- Exercise swap: typing the name or alias of the exercise being swapped (e.g. "Lat pulldown" while swapping lat pulldown) no longer creates a provisional duplicate; the picker says it is the same exercise.
