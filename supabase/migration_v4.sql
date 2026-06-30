-- =============================================================================
-- Enjazaty — Migration v4
-- Adds the contact-us messages table and a self-service account-deletion RPC.
-- Run AFTER the previous migrations.
-- =============================================================================

-- 1) contact_messages -------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users_profile(id) on delete set null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Any authenticated user can submit a message.
drop policy if exists "contact_insert" on public.contact_messages;
create policy "contact_insert" on public.contact_messages
  for insert to authenticated with check (true);

-- Senders (and admins) can read their own messages.
drop policy if exists "contact_select" on public.contact_messages;
create policy "contact_select" on public.contact_messages
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 2) delete_my_account ------------------------------------------------------
-- Deletes the caller's profile (cascading to all their data) and their auth
-- login. SECURITY DEFINER so it can remove the auth.users row.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.users_profile where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- =============================================================================
-- Done.
-- =============================================================================
