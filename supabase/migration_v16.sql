-- =============================================================================
-- Enjazaty — Migration v16 — Private supervisor-to-supervisor follow-up notes
--
-- Problem fixed: a supervisor reviewing a subordinate supervisor's page had
-- no way to leave a private note ("well managed" / "needs to follow up more
-- with their team") — the `notes` table already had a `target_user_id`
-- column for exactly this, but no UI used it, and its RLS let the targeted
-- employee read notes about themselves, which is wrong for this use case:
-- these are meant to stay strictly between supervisors in the chain above
-- the target, never visible to the target.
--
-- Fix:
--  1) notes gets a `kind` column ('praise' or 'concern') to tag a
--     target_user_id note, used to color/icon it in the UI.
--  2) notes_select: drop the old "target_user_id = auth.uid()" clause (the
--     target can no longer read notes about themselves) and grant read
--     access to any supervisor above the target in the chain instead.
--  3) notes_insert: only a supervisor of the target (or an admin) may create
--     a target_user_id note; achievement-linked notes keep the old
--     "any authenticated author" behavior unchanged.
--
-- Run AFTER migration_v15. Idempotent.
-- =============================================================================

alter table public.notes
  add column if not exists kind text check (kind in ('praise','concern'));

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select to authenticated
  using (
    author_id = auth.uid()
    or public.is_admin()
    or (target_user_id is not null and public.is_supervisor_of(target_user_id))
  );

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      target_user_id is null
      or public.is_supervisor_of(target_user_id)
      or public.is_admin()
    )
  );

-- =============================================================================
-- Done.
-- =============================================================================
