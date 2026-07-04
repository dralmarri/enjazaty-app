-- =============================================================================
-- Enjazaty — Migration v7 — Hierarchical administrative structure
--
-- Problem fixed: a top admin could not see what lives UNDER his sub-admins
-- (their employees, those employees' folders/works/evaluations), while at the
-- same time ANY admin could see EVERY user's data (flat is_admin model).
--
-- New model: supervision is TRANSITIVE. A supervisor sees himself + everyone
-- reachable through the supervisions chain (sub-admin → employee → …), and
-- NOTHING outside his own chain. Run AFTER migration_v6. Idempotent.
-- =============================================================================

-- 1) Recursive chain membership: is `target` = `sup` or anywhere below him?
--    UNION (not UNION ALL) makes the recursion cycle-safe.
create or replace function public.in_supervision_chain(sup uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive chain(uid) as (
    select subordinate_id from public.supervisions where supervisor_id = sup
    union
    select s.subordinate_id
    from public.supervisions s
    join chain c on s.supervisor_id = c.uid
  )
  select sup = target or exists (select 1 from chain where uid = target);
$$;

-- 2) Make the existing helper transitive — every policy that already uses
--    is_supervisor_of() becomes hierarchical automatically.
create or replace function public.is_supervisor_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.in_supervision_chain(auth.uid(), target);
$$;

-- 3) Scope DATA access to the viewer's own chain (privacy requirement:
--    an admin sees only what falls inside his administrative structure).

-- achievements
drop policy if exists "achievements_select" on public.achievements;
create policy "achievements_select" on public.achievements
  for select to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

drop policy if exists "achievements_insert" on public.achievements;
create policy "achievements_insert" on public.achievements
  for insert to authenticated
  with check (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

drop policy if exists "achievements_update" on public.achievements;
create policy "achievements_update" on public.achievements
  for update to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

drop policy if exists "achievements_delete" on public.achievements;
create policy "achievements_delete" on public.achievements
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

-- attachments
drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select" on public.attachments
  for select to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

drop policy if exists "attachments_write" on public.attachments;
create policy "attachments_write" on public.attachments
  for all to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id))
  with check (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

-- folders
drop policy if exists "folders_select" on public.folders;
create policy "folders_select" on public.folders
  for select to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

drop policy if exists "folders_write" on public.folders;
create policy "folders_write" on public.folders
  for all to authenticated
  using (owner_id = auth.uid() or public.is_supervisor_of(owner_id))
  with check (owner_id = auth.uid() or public.is_supervisor_of(owner_id));

-- evaluations: the employee, the evaluator, and every supervisor ABOVE the
-- employee (any level) can read; only someone in the chain above may create.
drop policy if exists "evaluations_select" on public.evaluations;
create policy "evaluations_select" on public.evaluations
  for select to authenticated
  using (
    employee_id = auth.uid() or evaluator_id = auth.uid()
    or public.is_supervisor_of(employee_id)
  );

drop policy if exists "evaluations_insert" on public.evaluations;
create policy "evaluations_insert" on public.evaluations
  for insert to authenticated
  with check (
    evaluator_id = auth.uid()
    and employee_id <> auth.uid()
    and public.is_supervisor_of(employee_id)
  );

-- supervisions: parties see their own links; a supervisor also sees ALL links
-- inside his chain (needed to render the full organisational tree).
drop policy if exists "supervisions_select" on public.supervisions;
create policy "supervisions_select" on public.supervisions
  for select to authenticated
  using (
    supervisor_id = auth.uid()
    or subordinate_id = auth.uid()
    or public.in_supervision_chain(auth.uid(), supervisor_id)
  );

-- =============================================================================
-- Done.
-- =============================================================================
