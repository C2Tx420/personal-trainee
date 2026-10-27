# Changelog

Format follows Keep a Changelog, versions follow SemVer (see plan v2.4 §15).

## [Unreleased]

Plan: v2.5 · Latest migration: 20261027000900

### Added
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

### Changed
- App renamed to **Personal Trainee** (manifest, home-screen title, login, notifications).
- Faster start: every screen except Today is a lazily loaded chunk (charts no longer in the main bundle); after the first launch on a device, bootstrap runs in the background instead of blocking the app.
- Hack squat is marked "not available" (the gym only has a Smith machine) and plank is archived. Plan v1 itself is unchanged; the coach builds the new exercise selection from the week of 02/11.
- Body measurements form asks only for the main ones: waist (navel), hip, chest, upper arm, thigh. Older entries for other measurements still show in the chart.
- Coach guidance: main lifts are compound free weights; skipped days are not failed sessions.
- `lat_pulldown` renamed "Máy kéo xô" → **"Kéo xô cáp"** (equipment: cable), matching the gym's cable station; the separate lat pulldown machine is its own exercise.
- Exercise library: 9 machine exercises for the gym's Matrix machines, with illustrations — leg extension, hip abduction, hip adduction, lateral raise machine, lat pulldown machine, seated dip, assisted dip, ab crunch machine, rotary torso (53 exercises). New muscle group "Đùi trong" (adductors). More aliases for seated cable row, chest-supported row and assisted pull-up.

### Fixed
- Page header on notch / Dynamic Island iPhones (e.g. 14 Pro Max): content no longer hugs the bottom edge; the "resume workout" banner now sits under the header instead of under the status bar; offline bar respects the safe area.
- Exercise swap: typing the name or alias of the exercise being swapped (e.g. "Lat pulldown" while swapping lat pulldown) no longer creates a provisional duplicate; the picker says it is the same exercise.
