-- Additional loginable development admin seed.
-- Depends on 041_dev_seed_loginable_users.sql.
-- Shared password for all accounts below: Devpass123
--
-- Additional admin accounts created by this seed:
--   seed.admin.2.browser@assetnext.dev
--   seed.admin.3.browser@assetnext.dev
--   seed.admin.4.browser@assetnext.dev
--   seed.admin.5.browser@assetnext.dev
--   seed.admin.6.browser@assetnext.dev

begin;

do $$
declare
  v_shared_password_hash text := crypt('Devpass123', gen_salt('bf', 10));
begin
  delete from public.login_logs
  where email in (
    'seed.admin.2.browser@assetnext.dev',
    'seed.admin.3.browser@assetnext.dev',
    'seed.admin.4.browser@assetnext.dev',
    'seed.admin.5.browser@assetnext.dev',
    'seed.admin.6.browser@assetnext.dev'
  );

  delete from public.app_sessions
  where user_id in (
    select user_id
    from public.profiles
    where email in (
      'seed.admin.2.browser@assetnext.dev',
      'seed.admin.3.browser@assetnext.dev',
      'seed.admin.4.browser@assetnext.dev',
      'seed.admin.5.browser@assetnext.dev',
      'seed.admin.6.browser@assetnext.dev'
    )
  );

  delete from public.profiles
  where email in (
    'seed.admin.2.browser@assetnext.dev',
    'seed.admin.3.browser@assetnext.dev',
    'seed.admin.4.browser@assetnext.dev',
    'seed.admin.5.browser@assetnext.dev',
    'seed.admin.6.browser@assetnext.dev'
  );

  delete from auth.users
  where email in (
    'seed.admin.2.browser@assetnext.dev',
    'seed.admin.3.browser@assetnext.dev',
    'seed.admin.4.browser@assetnext.dev',
    'seed.admin.5.browser@assetnext.dev',
    'seed.admin.6.browser@assetnext.dev'
  );

  insert into auth.users (
    id,
    email,
    password,
    email_verified,
    created_at,
    updated_at,
    profile,
    metadata,
    is_project_admin,
    is_anonymous
  ) values
    ('91000000-0000-4000-8000-000000000007', 'seed.admin.2.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '7 days', now(), jsonb_build_object('name', 'Seed Browser Admin 2'), jsonb_build_object('seed', true, 'kind', 'browser_admin_2'), false, false),
    ('91000000-0000-4000-8000-000000000008', 'seed.admin.3.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '6 days', now(), jsonb_build_object('name', 'Seed Browser Admin 3'), jsonb_build_object('seed', true, 'kind', 'browser_admin_3'), false, false),
    ('91000000-0000-4000-8000-000000000009', 'seed.admin.4.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '5 days', now(), jsonb_build_object('name', 'Seed Browser Admin 4'), jsonb_build_object('seed', true, 'kind', 'browser_admin_4'), false, false),
    ('91000000-0000-4000-8000-000000000010', 'seed.admin.5.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '4 days', now(), jsonb_build_object('name', 'Seed Browser Admin 5'), jsonb_build_object('seed', true, 'kind', 'browser_admin_5'), false, false),
    ('91000000-0000-4000-8000-000000000011', 'seed.admin.6.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '3 days', now(), jsonb_build_object('name', 'Seed Browser Admin 6'), jsonb_build_object('seed', true, 'kind', 'browser_admin_6'), false, false);

  insert into public.profiles (
    user_id,
    email,
    username,
    public_id,
    avatar_url,
    role,
    is_banned,
    ban_reason
  ) values
    ('91000000-0000-4000-8000-000000000007', 'seed.admin.2.browser@assetnext.dev', 'seed-admin-browser-2', 'ADM-BRW-02', null, 'admin', false, null),
    ('91000000-0000-4000-8000-000000000008', 'seed.admin.3.browser@assetnext.dev', 'seed-admin-browser-3', 'ADM-BRW-03', null, 'admin', false, null),
    ('91000000-0000-4000-8000-000000000009', 'seed.admin.4.browser@assetnext.dev', 'seed-admin-browser-4', 'ADM-BRW-04', null, 'admin', false, null),
    ('91000000-0000-4000-8000-000000000010', 'seed.admin.5.browser@assetnext.dev', 'seed-admin-browser-5', 'ADM-BRW-05', null, 'admin', false, null),
    ('91000000-0000-4000-8000-000000000011', 'seed.admin.6.browser@assetnext.dev', 'seed-admin-browser-6', 'ADM-BRW-06', null, 'admin', false, null)
  on conflict (user_id) do update
  set email = excluded.email,
      username = excluded.username,
      public_id = excluded.public_id,
      avatar_url = excluded.avatar_url,
      role = excluded.role,
      is_banned = excluded.is_banned,
      ban_reason = excluded.ban_reason,
      updated_at = now();
end
$$;

commit;
