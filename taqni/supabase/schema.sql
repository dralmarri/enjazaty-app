-- =============================================================================
-- تقني (Taqni) — Supabase schema (v1)
-- Run this in the Supabase SQL editor (or via the CLI) against تقني's OWN,
-- independent Supabase project — do NOT run this against the Enjazaty
-- project, and do not reuse Enjazaty's tables/policies/functions.
--
-- Tables: users_profile, schools, school_assignments, school_folders,
--         school_reference_info, visits, visit_reports, calendar_events,
--         activities, designer_records, notifications
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1) users_profile
-- Role hierarchy (smallest to largest): designer < coordinator < supervisor
-- < dept_manager < general_manager. Only the first three can self-register
-- and sign in at launch (see spec) — dept_manager/general_manager rows can
-- exist (future-proofing) but the app has no signup UI for them yet.
-- =============================================================================
create table if not exists public.users_profile (
  id                  uuid primary key default gen_random_uuid(),
  user_code           text unique not null,
  full_name           text not null,
  email               text not null,
  phone               text,
  role                text not null check (
    role in ('designer','coordinator','supervisor','dept_manager','general_manager')
  ),
  -- Only meaningful for role='designer' — one of the 6 sub-titles.
  job_title           text check (
    job_title is null or job_title in (
      'كبير اختصاصي تقنيات تربوية',
      'اختصاصي أول تقنيات تربوية',
      'اختصاصي تقنيات تربوية',
      'مصمم أول تقنيات تربوية',
      'مصمم تقنيات تربوية',
      'مصمم مبتدئ تقنيات تربوية'
    )
  ),
  -- Free-text full educational-region label for coordinator/supervisor/managers,
  -- e.g. "مراقبة توجيه التقنيات التربوية بمنطقة مبارك الكبير التعليمية".
  educational_region  text,
  -- Designer's primary school + stage.
  school_id           uuid,
  education_stage     text check (
    education_stage is null or education_stage in ('kindergarten','primary','intermediate','secondary')
  ),
  -- Internal classification only for newly-registered designers — NOT an
  -- access gate. The app must be usable normally while status='pending'.
  status              text not null default 'active' check (status in ('pending','active')),
  appointment_date    date,
  created_at          timestamptz not null default now()
);

-- Helper: current auth user's role (SECURITY DEFINER avoids recursive RLS).
create or replace function public.current_role_taqni()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users_profile where id = auth.uid();
$$;

create or replace function public.is_coordinator_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('coordinator','supervisor','dept_manager','general_manager')
     from public.users_profile where id = auth.uid()),
    false
  );
$$;

alter table public.users_profile enable row level security;

-- Any authenticated تقني user can read profiles (designer lists, school
-- rosters, hierarchical visibility all need this).
drop policy if exists "profiles_select" on public.users_profile;
create policy "profiles_select" on public.users_profile
  for select to authenticated using (true);

-- A user can insert their own profile row at signup only.
drop policy if exists "profiles_insert" on public.users_profile;
create policy "profiles_insert" on public.users_profile
  for insert to authenticated
  with check (id = auth.uid());

-- A user can update their own profile; coordinator/supervisor/managers can
-- update anyone's (e.g. assigning a designer, correcting a school).
drop policy if exists "profiles_update" on public.users_profile;
create policy "profiles_update" on public.users_profile
  for update to authenticated
  using (id = auth.uid() or public.is_coordinator_or_above());

-- =============================================================================
-- One email = one role, forever (same rule as Enjazaty migration_v8, applied
-- independently here since this is a separate database). Enforced by a DB
-- trigger, not just client-side validation.
-- =============================================================================
create or replace function public.prevent_role_change_taqni()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    raise exception
      'ROLE_LOCKED: the account role is permanent — register a new email for a new role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_change_taqni on public.users_profile;
create trigger trg_prevent_role_change_taqni
  before update on public.users_profile
  for each row execute function public.prevent_role_change_taqni();

-- =============================================================================
-- 2) schools
-- 113 schools in Mubarak Al-Kabeer educational region (32 kindergarten, 31
-- primary, 25 intermediate, 25 secondary). Seeded below with PLACEHOLDER
-- generic names until the real list is provided — see seed section at the
-- bottom of this file.
-- =============================================================================
create table if not exists public.schools (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  stage            text not null check (stage in ('kindergarten','primary','intermediate','secondary')),
  region           text not null default 'مبارك الكبير',
  google_maps_url  text,
  created_at       timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_profile_school_fk'
  ) then
    alter table public.users_profile
      add constraint users_profile_school_fk
      foreign key (school_id) references public.schools(id) on delete set null;
  end if;
end $$;

alter table public.schools enable row level security;

drop policy if exists "schools_select" on public.schools;
create policy "schools_select" on public.schools
  for select to authenticated using (true);

drop policy if exists "schools_write" on public.schools;
create policy "schools_write" on public.schools
  for all to authenticated
  using (public.is_coordinator_or_above())
  with check (public.is_coordinator_or_above());

-- =============================================================================
-- 3) school_assignments — extra designers linked to a school beyond the
-- designer's own school_id (supports a designer covering >1 school later).
-- =============================================================================
create table if not exists public.school_assignments (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  designer_id  uuid not null references public.users_profile(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (school_id, designer_id)
);

alter table public.school_assignments enable row level security;

drop policy if exists "school_assignments_select" on public.school_assignments;
create policy "school_assignments_select" on public.school_assignments
  for select to authenticated using (true);

drop policy if exists "school_assignments_write" on public.school_assignments;
create policy "school_assignments_write" on public.school_assignments
  for all to authenticated
  using (public.is_coordinator_or_above())
  with check (public.is_coordinator_or_above());

-- =============================================================================
-- 4) school_folders
-- =============================================================================
create table if not exists public.school_folders (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  name        text not null,
  created_by  uuid references public.users_profile(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.school_folders enable row level security;

drop policy if exists "school_folders_select" on public.school_folders;
create policy "school_folders_select" on public.school_folders
  for select to authenticated using (true);

drop policy if exists "school_folders_write" on public.school_folders;
create policy "school_folders_write" on public.school_folders
  for all to authenticated
  using (
    public.is_coordinator_or_above()
    or exists (
      select 1 from public.users_profile
      where id = auth.uid() and role = 'designer' and school_id = school_folders.school_id
    )
  )
  with check (
    public.is_coordinator_or_above()
    or exists (
      select 1 from public.users_profile
      where id = auth.uid() and role = 'designer' and school_id = school_folders.school_id
    )
  );

-- =============================================================================
-- 5) school_reference_info — غرفة العروض / العهدة / المختبر اللغوي.
-- Edited at the school level, not asked on every visit.
-- =============================================================================
create table if not exists public.school_reference_info (
  id                     uuid primary key default gen_random_uuid(),
  school_id              uuid not null unique references public.schools(id) on delete cascade,
  projector_room_notes   text,
  custody_notes          text,
  language_lab_notes     text,
  updated_by             uuid references public.users_profile(id) on delete set null,
  updated_at             timestamptz not null default now()
);

alter table public.school_reference_info enable row level security;

drop policy if exists "school_reference_info_select" on public.school_reference_info;
create policy "school_reference_info_select" on public.school_reference_info
  for select to authenticated using (true);

drop policy if exists "school_reference_info_write" on public.school_reference_info;
create policy "school_reference_info_write" on public.school_reference_info
  for all to authenticated
  using (
    public.is_coordinator_or_above()
    or exists (
      select 1 from public.users_profile
      where id = auth.uid() and role = 'designer' and school_id = school_reference_info.school_id
    )
  )
  with check (
    public.is_coordinator_or_above()
    or exists (
      select 1 from public.users_profile
      where id = auth.uid() and role = 'designer' and school_id = school_reference_info.school_id
    )
  );

-- =============================================================================
-- 6) visits (خطة الزيارات) — survey / guidance / evaluation / activity.
-- =============================================================================
create table if not exists public.visits (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  designer_id  uuid references public.users_profile(id) on delete set null,
  visit_type   text not null check (visit_type in ('survey','guidance','evaluation','activity')),
  visit_date   date not null,
  visit_time   time,
  notes        text,
  created_by   uuid references public.users_profile(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.visits enable row level security;

drop policy if exists "visits_select" on public.visits;
create policy "visits_select" on public.visits
  for select to authenticated using (true);

drop policy if exists "visits_write" on public.visits;
create policy "visits_write" on public.visits
  for all to authenticated
  using (created_by = auth.uid() or public.is_coordinator_or_above())
  with check (created_by = auth.uid() or public.is_coordinator_or_above());

-- =============================================================================
-- 7) visit_reports (تقارير الزيارة) — flexible JSON payload; the detailed
-- checklist item forms are a future iteration (see README).
-- =============================================================================
create table if not exists public.visit_reports (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references public.visits(id) on delete cascade,
  content     jsonb not null default '{}'::jsonb,
  created_by  uuid references public.users_profile(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.visit_reports enable row level security;

drop policy if exists "visit_reports_select" on public.visit_reports;
create policy "visit_reports_select" on public.visit_reports
  for select to authenticated using (true);

drop policy if exists "visit_reports_write" on public.visit_reports;
create policy "visit_reports_write" on public.visit_reports
  for all to authenticated
  using (created_by = auth.uid() or public.is_coordinator_or_above())
  with check (created_by = auth.uid() or public.is_coordinator_or_above());

-- =============================================================================
-- 8) calendar_events (كالندر) — shared by coordinator + designer.
-- =============================================================================
create table if not exists public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users_profile(id) on delete cascade,
  school_id    uuid references public.schools(id) on delete set null,
  title        text not null,
  description  text,
  event_date   date not null,
  event_time   time,
  created_at   timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select" on public.calendar_events;
create policy "calendar_events_select" on public.calendar_events
  for select to authenticated using (true);

drop policy if exists "calendar_events_write" on public.calendar_events;
create policy "calendar_events_write" on public.calendar_events
  for all to authenticated
  using (owner_id = auth.uid() or public.is_coordinator_or_above())
  with check (owner_id = auth.uid() or public.is_coordinator_or_above());

-- =============================================================================
-- 9) activities (أنشطة)
-- =============================================================================
create table if not exists public.activities (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references public.schools(id) on delete cascade,
  title          text not null,
  description    text,
  activity_date  date not null,
  created_by     uuid references public.users_profile(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.activities enable row level security;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select to authenticated using (true);

drop policy if exists "activities_write" on public.activities;
create policy "activities_write" on public.activities
  for all to authenticated
  using (created_by = auth.uid() or public.is_coordinator_or_above())
  with check (created_by = auth.uid() or public.is_coordinator_or_above());

-- =============================================================================
-- 10) designer_records (سجل المصمم) — generic shape, final unified form TBD.
-- =============================================================================
create table if not exists public.designer_records (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  designer_id   uuid references public.users_profile(id) on delete set null,
  record_date   date not null default current_date,
  notes         text,
  created_by    uuid references public.users_profile(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.designer_records enable row level security;

drop policy if exists "designer_records_select" on public.designer_records;
create policy "designer_records_select" on public.designer_records
  for select to authenticated using (true);

drop policy if exists "designer_records_write" on public.designer_records;
create policy "designer_records_write" on public.designer_records
  for all to authenticated
  using (created_by = auth.uid() or public.is_coordinator_or_above())
  with check (created_by = auth.uid() or public.is_coordinator_or_above());

-- =============================================================================
-- 11) notifications
-- =============================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users_profile(id) on delete cascade,
  title       text not null,
  body        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (public.is_coordinator_or_above() or user_id = auth.uid());

-- =============================================================================
-- Done. Next: run supabase/seed_schools.sql once to populate the 113
-- placeholder schools.
-- =============================================================================
