-- =============================================================================
-- Enjazaty — Migration v12 — Fix: deleted notifications reappear
--
-- Problem: public.notifications had row level security enabled with select /
-- insert / update policies, but no DELETE policy. Row level security defaults
-- to denying an operation when no policy grants it, so deleteNotification()
-- (src/lib/api.ts) silently deleted 0 rows — no error was raised, but the
-- notification was never actually removed. It disappeared from the screen
-- only until the next reload/focus, when it was fetched again and reappeared.
--
-- Fix: add a DELETE policy so recipients (or admins) can delete their own
-- notifications.
--
-- Run against the same database as schema.sql. Idempotent.
-- =============================================================================

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
