-- =============================================================================
-- Migration v24 — Fix "infinite recursion detected in policy for relation
-- circulars".
--
-- migration_v22 gave the two circular tables policies that referenced each
-- other: reading `circulars` checked `circular_recipients`, and reading
-- `circular_recipients` checked `circulars`. Postgres applies the other table's
-- policies inside those sub-queries, so the two kept calling each other and
-- sending a circular failed.
--
-- The fix is to break the cycle by storing the sender on the recipient row as
-- well, so `circular_recipients` policies never look at `circulars`.
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

alter table public.circular_recipients
  add column if not exists sender_id uuid references public.users_profile(id) on delete cascade;

-- Fill it in for rows created before this migration.
update public.circular_recipients r
   set sender_id = c.sender_id
  from public.circulars c
 where c.id = r.circular_id
   and r.sender_id is distinct from c.sender_id;

create index if not exists circular_recipients_sender_idx
  on public.circular_recipients (sender_id);

-- ------------------------------------------------------- circular_recipients --
-- These no longer mention `circulars` at all — that is what stops the loop.

drop policy if exists "circular_recipients_select" on public.circular_recipients;
create policy "circular_recipients_select" on public.circular_recipients
  for select to authenticated
  using (recipient_id = auth.uid() or sender_id = auth.uid());

drop policy if exists "circular_recipients_insert" on public.circular_recipients;
create policy "circular_recipients_insert" on public.circular_recipients
  for insert to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "circular_recipients_update" on public.circular_recipients;
create policy "circular_recipients_update" on public.circular_recipients
  for update to authenticated
  using (recipient_id = auth.uid() or sender_id = auth.uid());

drop policy if exists "circular_recipients_delete" on public.circular_recipients;
create policy "circular_recipients_delete" on public.circular_recipients
  for delete to authenticated
  using (sender_id = auth.uid());

-- ---------------------------------------------------------------- circulars --
-- Still checks the recipients table, which is now free of back-references.

drop policy if exists "circulars_select" on public.circulars;
create policy "circulars_select" on public.circulars
  for select to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.circular_recipients r
       where r.circular_id = circulars.id
         and r.recipient_id = auth.uid()
    )
  );

-- =============================================================================
-- Done.
-- =============================================================================
