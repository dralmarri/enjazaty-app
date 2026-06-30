-- =============================================================================
-- Enjazaty — Migration v6
-- Saved signatures library: a user can store multiple reusable signatures
-- (hand-drawn, serialized as SVG paths) and recall them when signing.
-- Run AFTER the previous migrations.
-- =============================================================================

create table if not exists public.signatures (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users_profile(id) on delete cascade,
  name       text,
  data       text not null,  -- JSON array of SVG path strings
  created_at timestamptz not null default now()
);

alter table public.signatures enable row level security;

-- Each user fully manages their own signatures.
drop policy if exists "signatures_select" on public.signatures;
create policy "signatures_select" on public.signatures
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "signatures_insert" on public.signatures;
create policy "signatures_insert" on public.signatures
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "signatures_update" on public.signatures;
create policy "signatures_update" on public.signatures
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "signatures_delete" on public.signatures;
create policy "signatures_delete" on public.signatures
  for delete to authenticated using (user_id = auth.uid());

create index if not exists idx_signatures_user on public.signatures(user_id);

-- =============================================================================
-- Done.
-- =============================================================================
