# Changelog

Format follows Keep a Changelog, versions follow SemVer (see plan v2.4 §15).

## [Unreleased]

Plan: v2.4 · Latest migration: 20261027000800

### Added
- Complete rebuild as a React PWA (Vite) + Supabase, replacing the old Expo app.
- Supabase sign-in (single account) + 4-digit PIN every time the app opens, verified server-side (secret `APP_PIN`); 5 wrong attempts → sign in again.
- Today screen: scheduled session, warm-up, goal countdown, banners for pending plan drafts / coach notes / Legs–badminton warning.
- Guided workout flow: timed warm-up → each exercise, each set (kg / reps / effort / note) → rest → summary; log actual kg with a reason; free-text exercise swap (provisional exercise); do later / skip exercise; resume after interruption.
- Backfill sessions, free-text quick log, log badminton / walk / zone 2 / core.
- Library of 38 exercises with SVG illustrations + technique cues, "machine not available" flag.
- Body weight + measurements + charts + goal line + 2-week plateau warning; InBody; private progress photos (EXIF stripped, 1080px, signed URLs).
- Versioned plans: diff, approve (today / scheduled date), reject, self-edit → new version.
- Web Push reminders, JSON backup / import, coach/ for Claude Code's Monday review.
- Dark-only theme with a single accent color and an SVG icon set.
- Seed: profile, 3 goals, InBody 26/10, plan v1 (week 1, machines first), Push session 26/10/2026.
