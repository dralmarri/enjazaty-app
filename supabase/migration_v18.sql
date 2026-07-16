-- =============================================================================
-- Migration v18 — Attendance tracking (supervisor-recorded exceptions)
--
-- Design: exception-based. A day with no row here means the employee was
-- present. A supervisor (or admin) records a row only when something
-- different happened: absence, sick leave, emergency leave, or a permission
-- (early leave / late arrival etc). This keeps daily data entry to just the
-- employees who actually need a note, instead of forcing a check-in for
-- everyone every day.
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

create table if not exists public.attendance_exceptions (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.users_profile(id) on delete cascade,
  date         date not null,
  type         text not null check (type in ('absent', 'sick_leave', 'emergency_leave', 'permission')),
  note         text,
  recorded_by  uuid not null references public.users_profile(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (employee_id, date)
);

alter table public.attendance_exceptions enable row level security;

-- The employee themselves, whoever recorded it, the employee's DIRECT
-- supervisor (per the `supervisions` table — not the whole chain), and
-- admins can read.
drop policy if exists "attendance_select" on public.attendance_exceptions;
create policy "attendance_select" on public.attendance_exceptions
  for select to authenticated
  using (
    employee_id = auth.uid()
    or recorded_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.supervisions
      where supervisor_id = auth.uid() and subordinate_id = employee_id
    )
  );

-- Only the employee's direct supervisor or an admin may record/edit/undo an
-- exception for that employee.
drop policy if exists "attendance_write" on public.attendance_exceptions;
create policy "attendance_write" on public.attendance_exceptions
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.supervisions
      where supervisor_id = auth.uid() and subordinate_id = employee_id
    )
  )
  with check (
    recorded_by = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.supervisions
        where supervisor_id = auth.uid() and subordinate_id = employee_id
      )
    )
  );

create index if not exists idx_attendance_employee on public.attendance_exceptions(employee_id);
create index if not exists idx_attendance_date     on public.attendance_exceptions(date);

-- =============================================================================
-- Done.
-- =============================================================================
