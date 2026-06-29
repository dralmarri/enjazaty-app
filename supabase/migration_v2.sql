-- =============================================================================
-- Enjazaty — Migration v2
-- Run this in the Supabase SQL editor AFTER the initial schema.sql.
-- Adds: profile fields (educational region / work center / administration),
-- the supervisions model (add subordinate by User ID + placement), and
-- evaluation electronic-signature + per-file lock.
-- =============================================================================

-- 1) New profile fields ------------------------------------------------------
alter table public.users_profile add column if not exists educational_region text;
alter table public.users_profile add column if not exists work_center text;        -- employees
alter table public.users_profile add column if not exists administration text;       -- admins

-- 2) supervisions ------------------------------------------------------------
-- A supervisor (any user) adds a subordinate by their User ID and chooses a
-- placement: their workspace home, or one of their folders.
create table if not exists public.supervisions (
  id             uuid primary key default gen_random_uuid(),
  supervisor_id  uuid not null references public.users_profile(id) on delete cascade,
  subordinate_id uuid not null references public.users_profile(id) on delete cascade,
  placement      text not null default 'workspace' check (placement in ('workspace','folder')),
  folder_id      uuid references public.folders(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (supervisor_id, subordinate_id)
);

alter table public.supervisions enable row level security;

-- Both parties (and admins) can read the relationship.
drop policy if exists "supervisions_select" on public.supervisions;
create policy "supervisions_select" on public.supervisions
  for select to authenticated
  using (supervisor_id = auth.uid() or subordinate_id = auth.uid() or public.is_admin());

-- Only the supervisor creates / removes the link.
drop policy if exists "supervisions_insert" on public.supervisions;
create policy "supervisions_insert" on public.supervisions
  for insert to authenticated with check (supervisor_id = auth.uid());

drop policy if exists "supervisions_update" on public.supervisions;
create policy "supervisions_update" on public.supervisions
  for update to authenticated using (supervisor_id = auth.uid());

drop policy if exists "supervisions_delete" on public.supervisions;
create policy "supervisions_delete" on public.supervisions
  for delete to authenticated using (supervisor_id = auth.uid());

create index if not exists idx_supervisions_supervisor on public.supervisions(supervisor_id);
create index if not exists idx_supervisions_subordinate on public.supervisions(subordinate_id);

-- 3) Helper: is the current user a supervisor of `target`? --------------------
create or replace function public.is_supervisor_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.supervisions
    where supervisor_id = auth.uid() and subordinate_id = target
  );
$$;

-- 4) Let supervisors read their subordinates' work ---------------------------
-- achievements
drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select" on public.achievements
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id));

-- attachments
drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id));

-- evaluations: subordinate sees evaluations about them; supervisor/admin too.
drop policy if exists "evaluations_select" on public.evaluations;
create policy "evaluations_select" on public.evaluations
  for select to authenticated
  using (
    employee_id = auth.uid() or evaluator_id = auth.uid()
    or public.is_admin() or public.is_supervisor_of(employee_id)
  );

-- Any supervisor (not just admins) can create an evaluation for a subordinate,
-- but never for themselves.
drop policy if exists "evaluations_insert" on public.evaluations;
create policy "evaluations_insert" on public.evaluations
  for insert to authenticated
  with check (
    evaluator_id = auth.uid()
    and employee_id <> auth.uid()
    and (public.is_admin() or public.is_supervisor_of(employee_id))
  );

-- 5) Evaluation: electronic signature + per-file lock ------------------------
alter table public.evaluations add column if not exists signature text;   -- typed e-signature
-- One evaluation per achievement → it can't be re-opened/re-submitted.
create unique index if not exists uniq_eval_per_achievement
  on public.evaluations(achievement_id);

-- =============================================================================
-- Done.
-- =============================================================================
