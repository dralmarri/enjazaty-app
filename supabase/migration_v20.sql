-- =============================================================================
-- Migration v20 — Separate achievement folders from employee folders.
--
-- Until now a single `folders` tree served two very different purposes:
--   * folders that hold ACHIEVEMENTS (achievements.folder_id)
--   * folders the admin drops SUPERVISED EMPLOYEES into (supervisions.folder_id)
-- Both were mixed together in one grid on the workspace home, so there was no
-- way to tell what a folder contained.
--
-- This adds a `kind` column so each folder belongs to exactly one side:
--   'achievements' → shown in the new "My achievements" tab
--   'employees'    → shown in the workspace (team) tab
--
-- Existing folders are classified automatically: any folder that currently has
-- employees placed in it becomes 'employees', everything else 'achievements'.
-- Nothing is deleted and no folder loses its contents.
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

alter table public.folders
  add column if not exists kind text not null default 'achievements';

alter table public.folders
  drop constraint if exists folders_kind_check;

alter table public.folders
  add constraint folders_kind_check
  check (kind in ('achievements', 'employees'));

-- Backfill: a folder that already holds supervised employees is an employee
-- folder. Runs only on rows still carrying the default, so re-running this
-- migration never overwrites a choice made later inside the app.
update public.folders f
   set kind = 'employees'
 where f.kind = 'achievements'
   and exists (
     select 1 from public.supervisions s where s.folder_id = f.id
   );

-- A sub-folder always belongs to the same side as its parent. Repeat a few
-- times so nesting several levels deep is covered.
do $$
begin
  for i in 1..5 loop
    update public.folders c
       set kind = p.kind
      from public.folders p
     where c.parent_id = p.id
       and c.kind is distinct from p.kind;
  end loop;
end $$;

create index if not exists folders_owner_kind_idx
  on public.folders (owner_id, kind);

-- =============================================================================
-- Done.
-- =============================================================================
