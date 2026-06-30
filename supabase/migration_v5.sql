-- =============================================================================
-- Enjazaty — Migration v5
-- Lets a supervisor (or admin) create folders / achievements / attachments
-- INSIDE a subordinate's workspace (owner_id = the subordinate).
-- Run AFTER the previous migrations.
-- =============================================================================

-- folders: supervisor/admin may write rows owned by a subordinate
drop policy if exists "folders_write" on public.folders;
create policy "folders_write" on public.folders
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id))
  with check (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id));

-- achievements: allow inserting on behalf of a subordinate
drop policy if exists "achievements_insert" on public.achievements;
create policy "achievements_insert" on public.achievements
  for insert to authenticated
  with check (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id));

-- attachments: allow writing on behalf of a subordinate
drop policy if exists "attachments_write" on public.attachments;
create policy "attachments_write" on public.attachments
  for all to authenticated
  using (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id))
  with check (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id));

-- =============================================================================
-- Done.
-- =============================================================================
