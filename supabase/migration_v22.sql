-- =============================================================================
-- Migration v22 — Circulars (التعاميم).
--
-- A supervisor writes a circular ONCE and sends it to everyone below him in the
-- supervision chain, or to selected people. Recipients get a notification and
-- an archive card in their workspace. Reading it is recorded automatically —
-- there is no task, no due date and nothing to submit back, so this never
-- overlaps with the Civil Service Commission's task system.
--
-- Two tables:
--   circulars           — the circular itself (written once, stored once)
--   circular_recipients — who it was sent to, and when each of them opened it
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

create table if not exists public.circulars (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.users_profile(id) on delete cascade,
  /** Optional official number of the circular, e.g. "12/2026". */
  number       text,
  title        text not null,
  body         text,
  /** Storage URL of the original circular file (PDF/image), when attached. */
  file_url     text,
  file_name    text,
  /** Pinned circulars stay on top of the archive. */
  pinned       boolean not null default false,
  /** The circular this one was re-broadcast from, when a sub-admin forwards it. */
  source_id    uuid references public.circulars(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.circular_recipients (
  id           uuid primary key default gen_random_uuid(),
  circular_id  uuid not null references public.circulars(id) on delete cascade,
  recipient_id uuid not null references public.users_profile(id) on delete cascade,
  /** Set the first time the recipient opens the circular. */
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (circular_id, recipient_id)
);

create index if not exists circulars_sender_idx on public.circulars (sender_id);
create index if not exists circular_recipients_recipient_idx
  on public.circular_recipients (recipient_id);

alter table public.circulars enable row level security;
alter table public.circular_recipients enable row level security;

-- ---------------------------------------------------------------- circulars --

-- A circular is visible to its sender and to the people it was sent to.
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

-- Anyone may write a circular, but only as themselves.
drop policy if exists "circulars_insert" on public.circulars;
create policy "circulars_insert" on public.circulars
  for insert to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "circulars_update" on public.circulars;
create policy "circulars_update" on public.circulars
  for update to authenticated
  using (sender_id = auth.uid());

drop policy if exists "circulars_delete" on public.circulars;
create policy "circulars_delete" on public.circulars
  for delete to authenticated
  using (sender_id = auth.uid());

-- ------------------------------------------------------- circular_recipients --

-- The sender sees who received (and read) his circular; a recipient sees his
-- own row only.
drop policy if exists "circular_recipients_select" on public.circular_recipients;
create policy "circular_recipients_select" on public.circular_recipients
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or exists (
      select 1 from public.circulars c
       where c.id = circular_recipients.circular_id
         and c.sender_id = auth.uid()
    )
  );

-- Only the sender of the circular adds recipients to it.
drop policy if exists "circular_recipients_insert" on public.circular_recipients;
create policy "circular_recipients_insert" on public.circular_recipients
  for insert to authenticated
  with check (
    exists (
      select 1 from public.circulars c
       where c.id = circular_recipients.circular_id
         and c.sender_id = auth.uid()
    )
  );

-- A recipient marks his own row as read; the sender may clean up his own.
drop policy if exists "circular_recipients_update" on public.circular_recipients;
create policy "circular_recipients_update" on public.circular_recipients
  for update to authenticated
  using (
    recipient_id = auth.uid()
    or exists (
      select 1 from public.circulars c
       where c.id = circular_recipients.circular_id
         and c.sender_id = auth.uid()
    )
  );

drop policy if exists "circular_recipients_delete" on public.circular_recipients;
create policy "circular_recipients_delete" on public.circular_recipients
  for delete to authenticated
  using (
    exists (
      select 1 from public.circulars c
       where c.id = circular_recipients.circular_id
         and c.sender_id = auth.uid()
    )
  );

-- Circular notifications get their own type so the bell can show them apart
-- from achievement/evaluation notifications.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('achievement','evaluation','note','system','assignment','circular'));

-- =============================================================================
-- Done.
-- =============================================================================
