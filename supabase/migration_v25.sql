-- =============================================================================
-- Migration v25 — Maintenance & custody requests.
--
-- Lets any employee submit a "طلب صيانة" (maintenance) or "طلب استعارة عهدة"
-- (custody/loan) request. The request text is auto-composed into an official
-- letter addressed to the head of the technology department, and the
-- requester's supervisor (school principal / admin) signs it electronically
-- to turn it into an approved correspondence — same trust model as
-- achievement evaluations (public.is_supervisor_of).
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

create table if not exists public.maintenance_requests (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid not null references public.users_profile(id) on delete cascade,
  kind           text not null check (kind in ('maintenance', 'custody')),
  request_type   text not null,
  body           text not null,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approver_id    uuid references public.users_profile(id) on delete set null,
  approver_note  text,
  signature      text,
  created_at     timestamptz not null default now(),
  approved_at    timestamptz
);

create index if not exists maintenance_requests_requester_idx
  on public.maintenance_requests (requester_id);

alter table public.maintenance_requests enable row level security;

-- The requester, anyone up his supervision chain, and admins can read.
drop policy if exists "maintenance_requests_select" on public.maintenance_requests;
create policy "maintenance_requests_select" on public.maintenance_requests
  for select to authenticated
  using (
    requester_id = auth.uid()
    or public.is_supervisor_of(requester_id)
    or public.is_admin()
  );

-- Only the requester files it, for himself.
drop policy if exists "maintenance_requests_insert" on public.maintenance_requests;
create policy "maintenance_requests_insert" on public.maintenance_requests
  for insert to authenticated
  with check (requester_id = auth.uid());

-- The requester can edit/cancel it only while still pending; his supervisor
-- chain / an admin can update it (approve/reject + sign) at any time.
drop policy if exists "maintenance_requests_update" on public.maintenance_requests;
create policy "maintenance_requests_update" on public.maintenance_requests
  for update to authenticated
  using (
    (requester_id = auth.uid() and status = 'pending')
    or public.is_supervisor_of(requester_id)
    or public.is_admin()
  );

drop policy if exists "maintenance_requests_delete" on public.maintenance_requests;
create policy "maintenance_requests_delete" on public.maintenance_requests
  for delete to authenticated
  using (requester_id = auth.uid() and status = 'pending');
