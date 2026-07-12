-- =============================================================================
-- Enjazaty — Migration v15 — "Fixed" checkmark on attachments
--
-- Problem fixed: once a supervisor sends an evaluation back as feedback
-- ('needs_revision'), the employee edits the attachment but has no way to
-- signal "I made the requested fix" on that specific file — the supervisor
-- has to guess or re-open the document to check before approving.
--
-- Fix: attachments gets a `fixed` boolean (default false) the owner toggles
-- on after editing. It's shown to the supervisor on the evaluation screen.
-- The API resets it back to false on every attachment whenever a new round
-- of feedback is sent, so a stale checkmark never carries over.
--
-- Run AFTER migration_v14. Idempotent.
-- =============================================================================

alter table public.attachments
  add column if not exists fixed boolean not null default false;

-- =============================================================================
-- Done.
-- =============================================================================
