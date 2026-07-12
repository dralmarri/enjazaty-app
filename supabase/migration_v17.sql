-- =============================================================================
-- Enjazaty — Migration v17 — Follow-up notes become visible to the employee
--
-- Reverses part of migration_v16: after reflection, the owner decided these
-- supervisor-to-supervisor follow-up notes should NOT be hidden from the
-- employee they're about — a documented, visible follow-up log both proves
-- the supervisor is actively following up (protects them) and nudges the
-- employee toward continuous improvement (they know it's tracked).
--
-- Only the READ side changes: the employee can now see notes about
-- themselves, but writing one is still restricted to a supervisor of the
-- target (or admin) — the employee still cannot author or edit their own
-- record. notes_insert/notes_modify/notes_delete are unchanged from v16.
--
-- Run AFTER migration_v16. Idempotent.
-- =============================================================================

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select to authenticated
  using (
    author_id = auth.uid()
    or target_user_id = auth.uid()
    or public.is_admin()
    or (target_user_id is not null and public.is_supervisor_of(target_user_id))
  );

-- =============================================================================
-- Done.
-- =============================================================================
