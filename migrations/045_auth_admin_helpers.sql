-- Create a stable trusted auth-admin boundary for Milestone 7 Phase 2 writes.
-- These helpers centralize exact auth-user lookup, create, password update, and compensation delete.

begin;

create or replace function public.get_auth_user_by_email(p_email text)
returns table (
  id uuid,
  email text,
  email_verified boolean
)
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id, u.email, u.email_verified
  from auth.users u
  where u.email = p_email
  limit 1
$$;

create or replace function public.admin_create_auth_user(p_email text, p_password text)
returns table (
  id uuid,
  email text,
  email_verified boolean
)
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  return query
  insert into auth.users (
    email,
    password,
    email_verified,
    created_at,
    updated_at,
    profile,
    metadata,
    is_project_admin,
    is_anonymous
  )
  values (
    p_email,
    crypt(p_password, gen_salt('bf', 10)),
    true,
    now(),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    false
  )
  returning auth.users.id, auth.users.email, auth.users.email_verified;
end;
$$;

create or replace function public.admin_update_auth_user_password(p_user_id uuid, p_new_password text)
returns table (
  id uuid
)
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  return query
  update auth.users
  set password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  where auth.users.id = p_user_id
  returning auth.users.id;
end;
$$;

create or replace function public.admin_delete_auth_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_deleted_count integer := 0;
begin
  delete from auth.users
  where auth.users.id = p_user_id;

  get diagnostics v_deleted_count = row_count;

  return v_deleted_count > 0;
end;
$$;

revoke all on function public.get_auth_user_by_email(text) from public;
revoke all on function public.admin_create_auth_user(text, text) from public;
revoke all on function public.admin_update_auth_user_password(uuid, text) from public;
revoke all on function public.admin_delete_auth_user(uuid) from public;

grant execute on function public.get_auth_user_by_email(text) to project_admin;
grant execute on function public.admin_create_auth_user(text, text) to project_admin;
grant execute on function public.admin_update_auth_user_password(uuid, text) to project_admin;
grant execute on function public.admin_delete_auth_user(uuid) to project_admin;

commit;
