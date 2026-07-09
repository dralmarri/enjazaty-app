-- =============================================================================
-- Enjazaty — Migration v11 — Lock approved achievements (content + deletion),
-- but still allow moving them between folders
--
-- Problem fixed: once an achievement is approved (supervisor/admin has signed
-- off on it), the owner (or even a supervisor) could still edit its title,
-- delete it entirely, or re-save its editable document (Word/Excel/PowerPoint
-- via the Zoho editor) — erasing or altering an official record. Moving the
-- achievement to a different folder is harmless organisation and stays
-- allowed even after approval.
--
-- Fix:
--  1) A BEFORE UPDATE/DELETE trigger blocks deleting an approved achievement,
--     and blocks changing anything about it EXCEPT folder_id / updated_at.
--     Approving itself still works, because at the moment the UPDATE runs the
--     row's *current* (OLD) status is still 'submitted' — the trigger only
--     locks rows that were ALREADY approved before this statement.
--  2) attachments of an approved achievement can't be edited/replaced either
--     (the Zoho document editor calls doc-session / doc-save, which now also
--     check the parent achievement's status — see those two edge functions).
--
-- Run AFTER migration_v7. Idempotent.
-- =============================================================================

create or replace function public.enforce_approved_achievement_lock()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'DELETE' then
    if OLD.status = 'approved' then
      raise exception 'Approved achievements cannot be deleted';
    end if;
    return OLD;
  end if;

  -- TG_OP = 'UPDATE': once approved, only folder_id (and updated_at) may change.
  if OLD.status = 'approved' then
    if NEW.title is distinct from OLD.title
       or NEW.description is distinct from OLD.description
       or NEW.status is distinct from OLD.status
       or NEW.owner_id is distinct from OLD.owner_id
       or NEW.department_id is distinct from OLD.department_id
       or NEW.date is distinct from OLD.date then
      raise exception 'Approved achievements cannot be edited (only moving to a folder is allowed)';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_approved_achievement_lock on public.achievements;
create trigger trg_enforce_approved_achievement_lock
  before update or delete on public.achievements
  for each row execute function public.enforce_approved_achievement_lock();
