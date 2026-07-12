-- =============================================================================
-- Enjazaty — Migration v14 — Split evaluation into "Send" (feedback) vs
-- "Approve" (final lock)
--
-- Problem fixed: the evaluation screen had one button that both saved the
-- supervisor's rating/comment AND permanently approved+locked the
-- achievement in the same action. There was no way for a supervisor to send
-- feedback/criticism back to the employee for correction before finalizing.
--
-- Fix:
--  1) evaluations gets a status column: 'sent' (feedback, not final) or
--     'approved' (final/locked). Existing rows are all past final approvals,
--     so they default to 'approved' — no behavior change for old data.
--  2) achievements.status gains a new value 'needs_revision': the state an
--     achievement is in after the supervisor sends feedback and before the
--     employee resubmits. It behaves like 'submitted' for every existing
--     lock/trigger (those only special-case 'approved'), so no other
--     migration needs touching.
--  3) evaluators can now UPDATE their own evaluation while it is still
--     'sent' (so re-sending feedback edits the same row instead of piling
--     up duplicates); once 'approved' it's immutable like before (no policy
--     allows updating an approved row).
--
-- Run AFTER migration_v13. Idempotent.
-- =============================================================================

-- 1) evaluations.status ------------------------------------------------------
alter table public.evaluations
  add column if not exists status text not null default 'approved'
    check (status in ('sent','approved'));

-- 2) achievements.status: add 'needs_revision' to the allowed set -----------
alter table public.achievements drop constraint if exists achievements_status_check;
alter table public.achievements
  add constraint achievements_status_check
  check (status in ('draft','submitted','approved','rejected','needs_revision'));

-- 3) evaluations_update policy -----------------------------------------------
drop policy if exists "evaluations_update" on public.evaluations;
create policy "evaluations_update" on public.evaluations
  for update to authenticated
  using (evaluator_id = auth.uid() and status = 'sent')
  with check (evaluator_id = auth.uid());

-- =============================================================================
-- Done.
-- =============================================================================
