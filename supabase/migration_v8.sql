-- =============================================================================
-- Enjazaty — Migration v8 — One email = one role, forever
--
-- Business rule: an email registered as an employee can never become an
-- admin account (and vice versa). Promotion to admin requires registering a
-- NEW email. Supabase Auth already guarantees one account per email; this
-- trigger guarantees the account's role can never be flipped afterwards —
-- not from the app, not via the API, not by another admin.
-- Run AFTER migration_v7. Idempotent.
-- =============================================================================

create or replace function public.prevent_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role then
    raise exception
      'ROLE_LOCKED: the account role is permanent — register a new email for a new role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_change on public.users_profile;
create trigger trg_prevent_role_change
  before update on public.users_profile
  for each row execute function public.prevent_role_change();

-- =============================================================================
-- Done.
-- =============================================================================
