-- Extensions for scheduled jobs (activating scheduled plans, sending reminders).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
