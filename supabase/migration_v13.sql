-- =============================================================================
-- Enjazaty — Migration v13 — Lock attachments of an approved achievement
--
-- Problem fixed: migration_v11 locked the achievement row itself (title,
-- description, deletion) once approved, and the Zoho document editor already
-- refuses to open/save an editable document once its achievement is approved
-- (doc-session / doc-save edge functions). But the attachments table itself
-- (public.attachments — images, videos, PDFs, files, links, audio) had no
-- such guard: "attachments_write" grants the owner (or admin) full
-- insert/update/delete via RLS regardless of the parent achievement's status.
-- The app UI doesn't currently expose a way to add/remove a single attachment
-- from an approved achievement, but nothing stopped it at the database level
-- if that UI is ever added, or via a direct API call.
--
-- Fix: a BEFORE INSERT/UPDATE/DELETE trigger on public.attachments blocks
-- adding, replacing, or deleting any attachment once the parent achievement
-- is approved. This matches the existing "approved records are locked" rule
-- and closes the gap for every attachment type (image/video/pdf/file/link/audio).
--
-- Run AFTER migration_v11. Idempotent.
-- =============================================================================

create or replace function public.enforce_approved_attachment_lock()
returns trigger language plpgsql as $$
declare
  target_achievement_id uuid;
  ach_status text;
begin
  target_achievement_id := coalesce(NEW.achievement_id, OLD.achievement_id);

  select status into ach_status
  from public.achievements
  where id = target_achievement_id;

  if ach_status = 'approved' then
    if TG_OP = 'DELETE' then
      raise exception 'Attachments of an approved achievement cannot be deleted';
    elsif TG_OP = 'INSERT' then
      raise exception 'Attachments cannot be added to an approved achievement';
    else
      raise exception 'Attachments of an approved achievement cannot be edited';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_enforce_approved_attachment_lock on public.attachments;
create trigger trg_enforce_approved_attachment_lock
  before insert or update or delete on public.attachments
  for each row execute function public.enforce_approved_attachment_lock();
