-- Create helper used by admin RLS policies and admin RPC checks.
-- This function treats profiles.role = 'admin' as the app-level admin source of truth.

begin;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'::public.role_enum
      and p.is_banned = false
  )
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

commit;
