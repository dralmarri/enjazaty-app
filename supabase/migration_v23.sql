-- =============================================================================
-- Migration v23 — Document kind for circulars (تعميم / كتاب رسمي / إعلان).
--
-- The same feature carries three kinds of official document:
--   'circular'     تعميم       — goes to everyone below the sender
--   'letter'       كتاب رسمي   — addressed to specific people
--   'announcement' إعلان       — general notice
--
-- The kind is a label used for filtering the archive. It changes nothing about
-- how the document behaves: it is still read-only for the recipient, with the
-- reading recorded automatically and nothing to submit back.
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

alter table public.circulars
  add column if not exists kind text not null default 'circular';

alter table public.circulars
  drop constraint if exists circulars_kind_check;

alter table public.circulars
  add constraint circulars_kind_check
  check (kind in ('circular', 'letter', 'announcement'));

-- =============================================================================
-- Done.
-- =============================================================================
