-- Extensions dùng cho lịch chạy định kỳ (kích hoạt lộ trình hẹn ngày, gửi nhắc nhở).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
