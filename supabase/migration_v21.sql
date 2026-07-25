-- =============================================================================
-- Migration v21 — Fix the folder classification done by migration v20.
--
-- v20 marked a folder as 'employees' only when employees sat DIRECTLY in it,
-- then pushed each parent's kind DOWN onto its children. That inverted the
-- right answer for a tree like:
--
--     المتوسط            (no employees directly inside → defaulted to 'achievements')
--       └─ متوسطة القبلية (has employees → correctly 'employees')
--
-- The parent overwrote the child, so the whole tree ended up in the
-- achievements tab.
--
-- The correct rule: a folder is an EMPLOYEE folder when it — or anything nested
-- under it — holds supervised employees. So the signal travels UPWARDS first,
-- and only then down into the remaining sub-folders.
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

-- 1) Direct hits: folders that hold employees themselves.
update public.folders f
   set kind = 'employees'
 where f.kind <> 'employees'
   and exists (
     select 1 from public.supervisions s where s.folder_id = f.id
   );

-- 2) Upwards: any ancestor of an employee folder is an employee folder too.
do $$
begin
  for i in 1..10 loop
    update public.folders p
       set kind = 'employees'
      from public.folders c
     where c.parent_id = p.id
       and c.kind = 'employees'
       and p.kind <> 'employees';
  end loop;
end $$;

-- 3) Downwards: everything nested under an employee folder follows it, so a
--    sub-folder never shows up in the other tab on its own.
do $$
begin
  for i in 1..10 loop
    update public.folders c
       set kind = 'employees'
      from public.folders p
     where c.parent_id = p.id
       and p.kind = 'employees'
       and c.kind <> 'employees';
  end loop;
end $$;

-- =============================================================================
-- Done. Folders can also be moved between the two tabs from inside the app
-- (long-press a folder → "move to workspace" / "move to my achievements").
-- =============================================================================
