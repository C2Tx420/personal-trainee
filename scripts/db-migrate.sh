#!/usr/bin/env bash
# Apply pending migrations straight with psql, using app_meta.schema_version as the watermark.
#
#   DB_URL='postgresql://…' pnpm run db:migrate             # apply
#   DB_URL='postgresql://…' pnpm run db:migrate --dry-run   # only list what would run
#
# - Each file runs in its own transaction (-1) and stops at the first error (exit 1).
# - Stops at the first migration dated after today (VN time): a file's timestamp is also its
#   earliest ship date.
#   Override with MIGRATE_ALLOW_FUTURE=1 only if you really mean it.
# - Each applied file is also recorded in supabase_migrations.schema_migrations (if that table
#   exists), so a later `supabase db push` doesn't run it a second time.
# - DB_URL comes from the environment only — never write it to a file in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DB_URL:?Cần biến môi trường DB_URL (connection string Postgres của Supabase thật)}"
dry=0
[[ "${1:-}" == "--dry-run" ]] && dry=1

q() { psql "$DB_URL" -X -v ON_ERROR_STOP=1 -Atc "$1"; }

# empty DB (first deploy): no app_meta yet → run everything
cur=$(q "select value from public.app_meta where key = 'schema_version'" 2>/dev/null || true)
today=$(TZ=Asia/Ho_Chi_Minh date +%Y%m%d)
has_history=$(q "select to_regclass('supabase_migrations.schema_migrations') is not null")
echo "đang ở: ${cur:-<trống>} · hôm nay: $today"

n=0
for f in supabase/migrations/*.sql; do
  name=$(basename "$f" .sql)
  v=${name%%_*}
  [[ "$v" > "${cur:-0}" ]] || continue
  if [[ "${v:0:8}" > "$today" && "${MIGRATE_ALLOW_FUTURE:-0}" != 1 ]]; then
    echo "⏸  dừng ở $name — đề ngày ${v:6:2}/${v:4:2}, chưa tới ngày chạy (MIGRATE_ALLOW_FUTURE=1 để ép)"
    break
  fi
  n=$((n + 1))
  if (( dry )); then echo "• sẽ chạy $f"; continue; fi
  echo "→ $f"
  if ! psql "$DB_URL" -X -v ON_ERROR_STOP=1 -1 -q -f "$f"; then
    echo "✗ lỗi ở $f — đã rollback file này, các file trước vẫn giữ" >&2
    exit 1
  fi
  if [[ "$has_history" == t ]]; then
    q "insert into supabase_migrations.schema_migrations (version, name) values ('$v', '${name#*_}') on conflict (version) do nothing" >/dev/null
  fi
done

(( n == 0 )) && echo "không có migration nào cần chạy"
(( dry )) && exit 0
echo "schema_version: $(q "select value from public.app_meta where key = 'schema_version'")"
