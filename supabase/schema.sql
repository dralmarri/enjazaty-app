-- =============================================================================
-- Enjazaty (إنجازاتي) — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI) to provision the
-- database: tables, Row Level Security (RLS) policies, and the storage bucket.
--
-- Tables: users_profile, departments, folders, achievements, attachments,
--         notes, evaluations, notifications
-- =============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1) users_profile
-- Profile data extending Supabase auth. For self-registered users, `id`
-- equals auth.users.id. Admin-invited employees may exist before they have an
-- auth login (id is a fresh uuid); they link up on first sign-in by email.
--
-- NOTE: this table is created BEFORE the is_admin() helper below because that
-- helper is a SQL-language function whose body is validated at creation time
-- and references this table.
-- =============================================================================
create table if not exists public.users_profile (
  id            uuid primary key default gen_random_uuid(),
  user_code     text unique not null,
  full_name     text not null,
  email         text not null,
  role          text not null default 'employee' check (role in ('admin','employee')),
  job_title     text,
  department_id uuid,
  avatar_url    text,
  phone         text,
  manager_id    uuid references public.users_profile(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helper: is the current auth user an admin?  (SECURITY DEFINER avoids the
-- recursive-RLS problem when policies need to read users_profile.)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users_profile
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.users_profile enable row level security;

-- Anyone authenticated can read profiles (needed for employee lists, authors).
drop policy if exists "profiles_select" on public.users_profile;
create policy "profiles_select" on public.users_profile
  for select to authenticated using (true);

-- A user can insert their own profile row (id = auth.uid()); admins can also
-- insert invited-employee rows.
drop policy if exists "profiles_insert" on public.users_profile;
create policy "profiles_insert" on public.users_profile
  for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

-- A user can update their own profile; admins can update anyone.
drop policy if exists "profiles_update" on public.users_profile;
create policy "profiles_update" on public.users_profile
  for update to authenticated
  using (id = auth.uid() or public.is_admin());

-- =============================================================================
-- 2) departments
-- =============================================================================
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null references public.users_profile(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.departments enable row level security;

drop policy if exists "departments_select" on public.departments;
create policy "departments_select" on public.departments
  for select to authenticated using (true);

drop policy if exists "departments_write" on public.departments;
create policy "departments_write" on public.departments
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 3) folders  (supports nesting via parent_id)
-- =============================================================================
create table if not exists public.folders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  color         text,
  parent_id     uuid references public.folders(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  owner_id      uuid not null references public.users_profile(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.folders enable row level security;

drop policy if exists "folders_select" on public.folders;
create policy "folders_select" on public.folders
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "folders_write" on public.folders;
create policy "folders_write" on public.folders
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 4) achievements
-- =============================================================================
create table if not exists public.achievements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text not null default 'draft'
                  check (status in ('draft','submitted','approved','rejected','needs_revision')),
  folder_id     uuid references public.folders(id) on delete set null,
  owner_id      uuid not null references public.users_profile(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  date          timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.achievements enable row level security;

-- Owners see their own; admins see all.
drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select" on public.achievements
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "achievements_insert" on public.achievements;
create policy "achievements_insert" on public.achievements
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Owner can edit own; admin can edit any (e.g. approve/reject).
drop policy if exists "achievements_update" on public.achievements;
create policy "achievements_update" on public.achievements
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "achievements_delete" on public.achievements;
create policy "achievements_delete" on public.achievements
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 5) attachments
-- =============================================================================
create table if not exists public.attachments (
  id             uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  type           text not null check (type in ('image','video','file','link','audio')),
  url            text not null,
  name           text,
  size           bigint,
  mime_type      text,
  owner_id       uuid not null references public.users_profile(id) on delete cascade,
  created_at     timestamptz not null default now()
);

alter table public.attachments enable row level security;

drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "attachments_write" on public.attachments;
create policy "attachments_write" on public.attachments
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 6) notes  (text / audio / image / sticker)
-- =============================================================================
create table if not exists public.notes (
  id             uuid primary key default gen_random_uuid(),
  content        text,
  type           text not null default 'text'
                   check (type in ('text','audio','image','sticker')),
  media_url      text,
  achievement_id uuid references public.achievements(id) on delete cascade,
  target_user_id uuid references public.users_profile(id) on delete cascade,
  author_id      uuid not null references public.users_profile(id) on delete cascade,
  created_at     timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Authors, the targeted employee, and admins can read.
drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select to authenticated
  using (author_id = auth.uid() or target_user_id = auth.uid() or public.is_admin());

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "notes_modify" on public.notes;
create policy "notes_modify" on public.notes
  for update to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 7) evaluations  (admin reviews of an employee's achievement)
-- =============================================================================
create table if not exists public.evaluations (
  id             uuid primary key default gen_random_uuid(),
  achievement_id uuid references public.achievements(id) on delete cascade,
  employee_id    uuid not null references public.users_profile(id) on delete cascade,
  evaluator_id   uuid not null references public.users_profile(id) on delete cascade,
  rating         int not null check (rating between 1 and 5),
  comment        text,
  status         text not null default 'approved' check (status in ('sent','approved')),
  created_at     timestamptz not null default now()
);

alter table public.evaluations enable row level security;

-- The evaluated employee, the evaluator, and admins can read.
drop policy if exists "evaluations_select" on public.evaluations;
create policy "evaluations_select" on public.evaluations
  for select to authenticated
  using (employee_id = auth.uid() or evaluator_id = auth.uid() or public.is_admin());

-- Only admins create evaluations.
drop policy if exists "evaluations_insert" on public.evaluations;
create policy "evaluations_insert" on public.evaluations
  for insert to authenticated
  with check (public.is_admin());

-- The evaluator can still edit their evaluation while it's just "sent"
-- feedback (not yet approved/locked).
drop policy if exists "evaluations_update" on public.evaluations;
create policy "evaluations_update" on public.evaluations
  for update to authenticated
  using (evaluator_id = auth.uid() and status = 'sent')
  with check (evaluator_id = auth.uid());

-- =============================================================================
-- 8) notifications
-- =============================================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users_profile(id) on delete cascade,
  title      text not null,
  body       text,
  type       text not null default 'system'
               check (type in ('achievement','evaluation','note','system','assignment')),
  read       boolean not null default false,
  related_id uuid,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Recipients read their own; admins may read all.
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Any authenticated user can create a notification (e.g. notify a manager).
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);

-- Recipients (or admins) can mark them read.
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated using (user_id = auth.uid() or public.is_admin());

-- Recipients (or admins) can delete their own notifications.
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- =============================================================================
-- Helpful indexes
-- =============================================================================
create index if not exists idx_achievements_owner    on public.achievements(owner_id);
create index if not exists idx_attachments_achievement on public.attachments(achievement_id);
create index if not exists idx_folders_owner          on public.folders(owner_id);
create index if not exists idx_notes_achievement      on public.notes(achievement_id);
create index if not exists idx_notes_target           on public.notes(target_user_id);
create index if not exists idx_evaluations_employee   on public.evaluations(employee_id);
create index if not exists idx_notifications_user     on public.notifications(user_id);
create index if not exists idx_profile_manager        on public.users_profile(manager_id);

-- =============================================================================
-- Storage bucket for attachments (images / videos / files / audio)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Public read of attachment files.
drop policy if exists "attachments_public_read" on storage.objects;
create policy "attachments_public_read" on storage.objects
  for select to public using (bucket_id = 'attachments');

-- Authenticated users may upload to their own folder (path: <uid>/...).
drop policy if exists "attachments_upload" on storage.objects;
create policy "attachments_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may manage their own uploaded files.
drop policy if exists "attachments_modify" on storage.objects;
create policy "attachments_modify" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_delete" on storage.objects;
create policy "attachments_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- Done. Remember to enable Email auth in Supabase Authentication settings.
-- =============================================================================
