# Health & Training

Personal single-user PWA for tracking training and body metrics: a fixed PPL + badminton schedule, a **guided workout flow** (warm-up → each exercise, each set → rest → summary), body weight, measurements, InBody scans and private progress photos. Every Monday **Claude Code** reads the data through a read-only role and submits a **plan draft** — it only takes effect once approved in the app.

React + Vite + `vite-plugin-pwa` · Supabase (Auth, Postgres + RLS, Storage, Edge Functions, pg_cron) · TanStack Query · Tailwind v4 · Recharts. Online-only, Vietnamese UI, mobile-first.

No Supabase CLI or Docker required: the app talks to a hosted Supabase project, configured from the dashboard.

```bash
pnpm install
cp .env.example .env.local  # project URL, anon key, VAPID public key
pnpm run dev                # app
pnpm test                   # engine unit tests (Vitest)
pnpm run functions:bundle   # one file per Edge Function → paste into the dashboard editor
```

Migrations are applied in filename order with `psql` against the session pooler URL; `app_meta.schema_version` holds the latest applied version, so only newer files need to run. `pnpm run db:test` (pgTAP) and `pnpm run e2e` (Playwright) expect a local Supabase stack and are optional.

## Structure

```
src/
  engine/        pure TS, tested with Vitest — schedule, goals, warm-up, workout flow, summary,
                 plan diff, substitutions, free-text quick log, weight, InBody, SVG, reminders
  data/          Supabase reads/writes + TanStack Query hooks (in-memory cache)
  auth/          sign-in, PIN on app open (verified by the verify-pin Edge Function)
  app/           screens: today/ workout/ training/ exercises/ body/ more/
  ui/            shared components, icons, charts
  export/        JSON backup pt-backup/1
  sw.ts          service worker: precaches static assets + Web Push (no data caching)
supabase/
  migrations/    schema, RLS, storage, RPCs, seed (generated), coach_readonly role, cron
  functions/     verify-pin, send-reminders (+ _shared/reminders.ts shared with the engine)
  seed/          38 exercises (json + svg), backfilled history (Push session 26/10/2026)
  tests/         pgTAP
scripts/         build-seed.ts, svg/ (exercise illustrations), make-icons.ts
coach/           CLAUDE.md + scripts for Claude Code: report, submit-draft, add-review-note…
e2e/             Playwright
```

## Principles

- Health data lives only in Supabase. No analytics, no third-party fonts or CDNs.
- Progress photos: private bucket, EXIF stripped and resized to 1080px before upload, viewed only through 60-second signed URLs, never cached, never included in coach reports.
- Reference calories ≥ 1,700 (DB CHECK + validator + coach). Legs and badminton never on consecutive days.
- Plans are immutable once approved; every change is a new version. Claude Code can only create drafts.
- Versioning: SemVer in `package.json` + `CHANGELOG.md` + git tag. Migrations are additive only.
