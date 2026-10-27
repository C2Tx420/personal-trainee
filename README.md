# Sức khỏe & Tập luyện

PWA cá nhân (1 người dùng) theo dõi tập luyện và cơ thể: lịch PPL + cầu lông cố định, **luồng tập từng bước** (khởi động → từng bài, từng hiệp → nghỉ → tổng kết), cân nặng, số đo, InBody, ảnh tiến độ riêng tư. Mỗi thứ Hai **Claude Code** đọc số liệu qua role chỉ-đọc và gửi **draft lộ trình** — anh duyệt trong app mới có hiệu lực.

React + Vite + `vite-plugin-pwa` · Supabase (Auth, Postgres + RLS, Storage, Edge Functions, pg_cron) · TanStack Query · Tailwind v4 · Recharts. Online-only, giao diện tiếng Việt, ưu tiên điện thoại.

```bash
npm install
supabase start && supabase db reset
npm run dev          # app
npm test             # unit test engine (Vitest)
npm run db:test      # pgTAP: RLS, ràng buộc, quyền coach
npm run e2e          # Playwright toàn luồng + ảnh chụp e2e/screenshots/
```

## Cấu trúc

```
src/
  engine/        TS thuần, test bằng Vitest — lịch, mốc, khởi động, luồng tập, tổng kết,
                 diff lộ trình, đổi bài, ghi nhanh bằng chữ, cân nặng, InBody, SVG, nhắc nhở
  data/          đọc/ghi Supabase + hook TanStack Query (cache trong bộ nhớ)
  auth/          đăng nhập, khoá PIN (kiểm tra ở Edge Function verify-pin), tự khoá 5 phút
  app/           các màn: today/ workout/ training/ exercises/ body/ more/
  ui/            component dùng chung + biểu đồ
  export/        sao lưu JSON pt-backup/1
  sw.ts          service worker: precache file tĩnh + Web Push (không cache dữ liệu)
supabase/
  migrations/    schema, RLS, storage, RPC, seed (sinh tự động), role coach_readonly, cron
  functions/     verify-pin, send-reminders (+ _shared/reminders.ts dùng chung với engine)
  seed/          38 bài tập (json + svg), lịch sử ghi bù (buổi Push 26/10/2026)
  tests/         pgTAP
scripts/         build-seed.ts, svg/ (sinh hình bài tập), make-icons.ts
coach/           CLAUDE.md + script cho Claude Code: report, submit-draft, add-review-note…
e2e/             Playwright
```

## Nguyên tắc

- Dữ liệu sức khỏe chỉ nằm trên Supabase. Không analytics, không font/CDN bên thứ ba.
- Ảnh tiến độ: bucket private, xoá EXIF + nén 1080px trước khi upload, chỉ xem qua signed URL 60 giây, không cache, không vào báo cáo coach.
- Calo tham khảo ≥ 1.700 (CHECK trong DB + validator + coach). Legs và cầu lông không liền ngày.
- Lộ trình bất biến sau khi duyệt; mọi thay đổi là một phiên bản mới. Claude Code chỉ tạo được draft.
- Version: SemVer trong `package.json` + `CHANGELOG.md` + git tag. Migration chỉ mở rộng.
