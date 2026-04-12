-- Full development seed for the split MVP migration set.
-- Depends on:
--   001_extensions.sql
--   002_enums.sql
--   003_core_helpers.sql
--   010_profiles_and_auth_tables.sql
--   011_catalog_tables.sql
--   012_subscription_tables.sql
--   020_admin_access_helpers.sql
--   021_rls_policies.sql
--   022_subscription_engine.sql
--   023_triggers.sql
--   024_views.sql
--   030_rpc.sql
-- Purpose:
--   Create a realistic development dataset that covers admin, members, packages,
--   assets, subscriptions, assignments, transactions, CD-Keys, sessions, login logs,
--   extension tracks, and deleted-asset history.

-- Development accounts created by this seed:
--   admin@assetnext.dev / Devpass123
--   user.a@assetnext.dev / Devpass123
--   user.b@assetnext.dev / Devpass123
--   user.c@assetnext.dev / Devpass123
--   user.d@assetnext.dev / Devpass123

begin;

select public.seed_package(
  'paket_1',
  'Paket 1',
  250000,
  30,
  true,
  '["tradingview:private", "fxreplay:share", "fxtester:share", "fxtester:private"]'::jsonb,
  null,
  true
);

select public.seed_package(
  'paket_2',
  'Paket 2',
  150000,
  30,
  true,
  '["tradingview:share", "fxreplay:private"]'::jsonb,
  null,
  true
);

select public.seed_package(
  'paket_3',
  'Paket 3',
  100000,
  30,
  true,
  '["tradingview:share"]'::jsonb,
  null,
  true
);

select public.seed_package(
  'paket_dev_disabled',
  'Paket Dev Disabled',
  50000,
  7,
  false,
  '["tradingview:private"]'::jsonb,
  null,
  false
);

do $$
declare
  v_admin_id uuid;
  v_user_a_id uuid;
  v_user_b_id uuid;
  v_user_c_id uuid;
  v_user_d_id uuid;
  v_paket_1 uuid;
  v_paket_2 uuid;
  v_paket_3 uuid;
  v_paket_dev_disabled uuid;
begin
  select id into v_admin_id from auth.users where email = 'admin@assetnext.dev';
  select id into v_user_a_id from auth.users where email = 'user.a@assetnext.dev';
  select id into v_user_b_id from auth.users where email = 'user.b@assetnext.dev';
  select id into v_user_c_id from auth.users where email = 'user.c@assetnext.dev';
  select id into v_user_d_id from auth.users where email = 'user.d@assetnext.dev';

  if v_admin_id is null or v_user_a_id is null or v_user_b_id is null or v_user_c_id is null or v_user_d_id is null then
    raise exception 'development auth users are missing; register auth users before applying 040_dev_seed_full.sql';
  end if;

  update auth.users
  set email_verified = true,
      is_project_admin = false,
      updated_at = now(),
      profile = case email
        when 'admin@assetnext.dev' then jsonb_build_object('name', 'Admin AssetNext')
        when 'user.a@assetnext.dev' then jsonb_build_object('name', 'User A')
        when 'user.b@assetnext.dev' then jsonb_build_object('name', 'User B')
        when 'user.c@assetnext.dev' then jsonb_build_object('name', 'User C')
        when 'user.d@assetnext.dev' then jsonb_build_object('name', 'User D')
        else coalesce(profile, '{}'::jsonb)
      end
  where email in (
    'admin@assetnext.dev',
    'user.a@assetnext.dev',
    'user.b@assetnext.dev',
    'user.c@assetnext.dev',
    'user.d@assetnext.dev'
  );

  select id into v_paket_1 from public.packages where code = 'paket_1';
  select id into v_paket_2 from public.packages where code = 'paket_2';
  select id into v_paket_3 from public.packages where code = 'paket_3';
  select id into v_paket_dev_disabled from public.packages where code = 'paket_dev_disabled';

  insert into public.profiles (
    user_id, email, username, public_id, avatar_url, role, is_banned, ban_reason
  ) values
    (v_admin_id, 'admin@assetnext.dev', 'admin', 'ADM-001', null, 'admin', false, null),
    (v_user_a_id, 'user.a@assetnext.dev', 'usera', 'MEM-001', null, 'member', false, null),
    (v_user_b_id, 'user.b@assetnext.dev', 'userb', 'MEM-002', null, 'member', false, null),
    (v_user_c_id, 'user.c@assetnext.dev', 'userc', 'MEM-003', null, 'member', false, null),
    (v_user_d_id, 'user.d@assetnext.dev', 'userd', 'MEM-004', null, 'member', false, null)
  on conflict (user_id) do update
  set email = excluded.email,
      username = excluded.username,
      public_id = excluded.public_id,
      avatar_url = excluded.avatar_url,
      role = excluded.role,
      is_banned = excluded.is_banned,
      ban_reason = excluded.ban_reason,
      updated_at = now();

  insert into public.assets (
    id, platform, asset_type, account, proxy, note, asset_json, expires_at, disabled_at
  ) values
    ('20000000-0000-0000-0000-000000000001', 'tradingview', 'private', 'tv-private-1@seed.dev', 'http://proxy.tv.private.1', 'seed_tv_private_1', '[{"name":"session","value":"tvp1"}]'::jsonb, now() + interval '90 days', null),
    ('20000000-0000-0000-0000-000000000002', 'tradingview', 'private', 'tv-private-2@seed.dev', 'http://proxy.tv.private.2', 'seed_tv_private_2', '[{"name":"session","value":"tvp2"}]'::jsonb, now() + interval '120 days', null),
    ('20000000-0000-0000-0000-000000000003', 'tradingview', 'share', 'tv-share-1@seed.dev', 'http://proxy.tv.share.1', 'seed_tv_share_1', '[{"name":"session","value":"tvs1"}]'::jsonb, now() + interval '60 days', null),
    ('20000000-0000-0000-0000-000000000004', 'tradingview', 'share', 'tv-share-2@seed.dev', 'http://proxy.tv.share.2', 'seed_tv_share_2', '[{"name":"session","value":"tvs2"}]'::jsonb, now() + interval '60 days', null),
    ('20000000-0000-0000-0000-000000000005', 'fxreplay', 'private', 'fx-private-1@seed.dev', 'http://proxy.fx.private.1', 'seed_fx_private_1', '[{"name":"session","value":"fxp1"}]'::jsonb, now() + interval '45 days', null),
    ('20000000-0000-0000-0000-000000000006', 'fxreplay', 'private', 'fx-private-2@seed.dev', 'http://proxy.fx.private.2', 'seed_fx_private_2', '[{"name":"session","value":"fxp2"}]'::jsonb, now() + interval '90 days', null),
    ('20000000-0000-0000-0000-000000000007', 'fxreplay', 'share', 'fx-share-1@seed.dev', 'http://proxy.fx.share.1', 'seed_fx_share_1', '[{"name":"session","value":"fxs1"}]'::jsonb, now() + interval '75 days', null),
    ('20000000-0000-0000-0000-000000000008', 'fxreplay', 'share', 'fx-share-2@seed.dev', 'http://proxy.fx.share.2', 'seed_fx_share_2', '[{"name":"session","value":"fxs2"}]'::jsonb, now() + interval '75 days', null),
    ('20000000-0000-0000-0000-000000000009', 'fxtester', 'private', 'ft-private-1@seed.dev', 'http://proxy.ft.private.1', 'seed_ft_private_1', '[{"name":"session","value":"ftp1"}]'::jsonb, now() + interval '45 days', null),
    ('20000000-0000-0000-0000-000000000010', 'fxtester', 'private', 'ft-private-2@seed.dev', 'http://proxy.ft.private.2', 'seed_ft_private_2', '[{"name":"session","value":"ftp2"}]'::jsonb, now() + interval '90 days', null),
    ('20000000-0000-0000-0000-000000000011', 'fxtester', 'share', 'ft-share-1@seed.dev', 'http://proxy.ft.share.1', 'seed_ft_share_1', '[{"name":"session","value":"fts1"}]'::jsonb, now() + interval '75 days', null),
    ('20000000-0000-0000-0000-000000000012', 'fxtester', 'share', 'ft-share-2@seed.dev', 'http://proxy.ft.share.2', 'seed_ft_share_2', '[{"name":"session","value":"fts2"}]'::jsonb, now() + interval '75 days', null),
    ('20000000-0000-0000-0000-000000000013', 'tradingview', 'share', 'tv-share-disabled@seed.dev', 'http://proxy.tv.share.disabled', 'seed_tv_share_disabled', '[{"name":"session","value":"tvsd"}]'::jsonb, now() + interval '30 days', now() - interval '1 day'),
    ('20000000-0000-0000-0000-000000000014', 'fxreplay', 'share', 'fx-share-expired@seed.dev', 'http://proxy.fx.share.expired', 'seed_fx_share_expired', '[{"name":"session","value":"fxse"}]'::jsonb, now() - interval '3 days', null),
    ('20000000-0000-0000-0000-000000000015', 'tradingview', 'share', 'tv-share-deleted@seed.dev', 'http://proxy.tv.share.deleted', 'seed_tv_share_deleted_history', '[{"name":"session","value":"tvsdh"}]'::jsonb, now() + interval '20 days', null)
  on conflict (id) do update
  set platform = excluded.platform,
      asset_type = excluded.asset_type,
      account = excluded.account,
      proxy = excluded.proxy,
      note = excluded.note,
      asset_json = excluded.asset_json,
      expires_at = excluded.expires_at,
      disabled_at = excluded.disabled_at,
      updated_at = now();

  insert into public.subscriptions (
    id, user_id, package_id, package_name, access_keys_json, status, source, start_at, end_at, cancel_reason
  ) values
    ('30000000-0000-0000-0000-000000000001', v_user_a_id, v_paket_3, 'Paket 3', '["tradingview:share"]'::jsonb, 'active', 'payment_dummy', now() - interval '20 days', now() + interval '10 days', null),
    ('30000000-0000-0000-0000-000000000002', v_user_b_id, v_paket_2, 'Paket 2', '["tradingview:share", "fxreplay:private"]'::jsonb, 'processed', 'admin_manual', now() - interval '5 days', now() + interval '25 days', null),
    ('30000000-0000-0000-0000-000000000003', v_user_c_id, v_paket_1, 'Paket 1', '["tradingview:private", "fxreplay:share", "fxtester:share", "fxtester:private"]'::jsonb, 'active', 'payment_dummy', now() - interval '2 days', now() + interval '28 days', null),
    ('30000000-0000-0000-0000-000000000004', v_user_d_id, v_paket_3, 'Paket 3', '["tradingview:share"]'::jsonb, 'processed', 'cdkey', now() - interval '40 days', now() + interval '1 day', null),
    ('30000000-0000-0000-0000-000000000005', v_user_a_id, v_paket_2, 'Paket 2', '["tradingview:share", "fxreplay:private"]'::jsonb, 'canceled', 'admin_manual', now() - interval '60 days', now() - interval '30 days', 'admin_canceled_for_seed')
  on conflict (id) do update
  set user_id = excluded.user_id,
      package_id = excluded.package_id,
      package_name = excluded.package_name,
      access_keys_json = excluded.access_keys_json,
      status = excluded.status,
      source = excluded.source,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      cancel_reason = excluded.cancel_reason,
      updated_at = now();

  insert into public.asset_assignments (
    id,
    subscription_id,
    user_id,
    asset_id,
    original_asset_id,
    access_key,
    asset_platform,
    asset_type,
    asset_note,
    asset_expires_at,
    asset_deleted_at,
    assigned_at,
    revoked_at,
    revoke_reason
  ) values
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', v_user_a_id, '20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'tradingview:share', 'tradingview', 'share', 'seed_tv_share_1', now() + interval '60 days', null, now() - interval '20 days', null, null),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', v_user_b_id, '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'tradingview:share', 'tradingview', 'share', 'seed_tv_share_2', now() + interval '60 days', null, now() - interval '5 days', null, null),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', v_user_c_id, '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'tradingview:private', 'tradingview', 'private', 'seed_tv_private_1', now() + interval '90 days', null, now() - interval '2 days', null, null),
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', v_user_c_id, '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'fxreplay:share', 'fxreplay', 'share', 'seed_fx_share_1', now() + interval '75 days', null, now() - interval '2 days', null, null),
    ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', v_user_c_id, '20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011', 'fxtester:share', 'fxtester', 'share', 'seed_ft_share_1', now() + interval '75 days', null, now() - interval '2 days', null, null),
    ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', v_user_c_id, '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'fxtester:private', 'fxtester', 'private', 'seed_ft_private_1', now() + interval '45 days', null, now() - interval '2 days', null, null),
    ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004', v_user_d_id, '20000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000015', 'tradingview:share', 'tradingview', 'share', 'seed_tv_share_deleted_history', now() + interval '20 days', null, now() - interval '39 days', now() - interval '10 days', 'subscription_expired')
  on conflict (id) do update
  set subscription_id = excluded.subscription_id,
      user_id = excluded.user_id,
      asset_id = excluded.asset_id,
      original_asset_id = excluded.original_asset_id,
      access_key = excluded.access_key,
      asset_platform = excluded.asset_platform,
      asset_type = excluded.asset_type,
      asset_note = excluded.asset_note,
      asset_expires_at = excluded.asset_expires_at,
      asset_deleted_at = excluded.asset_deleted_at,
      assigned_at = excluded.assigned_at,
      revoked_at = excluded.revoked_at,
      revoke_reason = excluded.revoke_reason;

  insert into public.cd_keys (
    id, code, package_id, duration_days, is_extended, access_keys_json, amount_rp, is_active, created_by, used_by, used_at
  ) values
    ('60000000-0000-0000-0000-000000000001', 'DEV-P1-UNUSED', v_paket_1, 30, true, '["tradingview:private", "fxreplay:share", "fxtester:share", "fxtester:private"]'::jsonb, 250000, true, v_admin_id, null, null),
    ('60000000-0000-0000-0000-000000000002', 'DEV-P3-USED', v_paket_3, 30, true, '["tradingview:share"]'::jsonb, 0, true, v_admin_id, v_user_d_id, now() - interval '40 days'),
    ('60000000-0000-0000-0000-000000000003', 'DEV-P2-UNUSED', v_paket_2, 30, true, '["tradingview:share", "fxreplay:private"]'::jsonb, 150000, true, v_admin_id, null, null),
    ('60000000-0000-0000-0000-000000000004', 'DEV-DISABLED', v_paket_dev_disabled, 7, false, '["tradingview:private"]'::jsonb, 50000, false, v_admin_id, null, null)
  on conflict (id) do update
  set code = excluded.code,
      package_id = excluded.package_id,
      duration_days = excluded.duration_days,
      is_extended = excluded.is_extended,
      access_keys_json = excluded.access_keys_json,
      amount_rp = excluded.amount_rp,
      is_active = excluded.is_active,
      created_by = excluded.created_by,
      used_by = excluded.used_by,
      used_at = excluded.used_at,
      updated_at = now();

  insert into public.transactions (
    id, code, user_id, subscription_id, package_id, package_name, source, status, amount_rp, cd_key_id, paid_at, failure_reason
  ) values
    ('50000000-0000-0000-0000-000000000001', 'TX-DEV-0001', v_user_a_id, '30000000-0000-0000-0000-000000000001', v_paket_3, 'Paket 3', 'payment_dummy', 'success', 100000, null, now() - interval '20 days', null),
    ('50000000-0000-0000-0000-000000000002', 'TX-DEV-0002', v_user_b_id, '30000000-0000-0000-0000-000000000002', v_paket_2, 'Paket 2', 'admin_manual', 'success', 150000, null, now() - interval '5 days', null),
    ('50000000-0000-0000-0000-000000000003', 'TX-DEV-0003', v_user_c_id, '30000000-0000-0000-0000-000000000003', v_paket_1, 'Paket 1', 'payment_dummy', 'success', 250000, null, now() - interval '2 days', null),
    ('50000000-0000-0000-0000-000000000004', 'TX-DEV-0004', v_user_d_id, '30000000-0000-0000-0000-000000000004', v_paket_3, 'Paket 3', 'cdkey', 'success', 0, '60000000-0000-0000-0000-000000000002', now() - interval '40 days', null),
    ('50000000-0000-0000-0000-000000000005', 'TX-DEV-0005', v_user_a_id, null, v_paket_1, 'Paket 1', 'payment_dummy', 'pending', 250000, null, null, null),
    ('50000000-0000-0000-0000-000000000006', 'TX-DEV-0006', v_user_b_id, null, v_paket_2, 'Paket 2', 'payment_dummy', 'failed', 150000, null, null, 'payment_failed'),
    ('50000000-0000-0000-0000-000000000007', 'TX-DEV-0007', v_user_c_id, null, v_paket_3, 'Paket 3', 'payment_dummy', 'canceled', 100000, null, null, 'user_canceled')
  on conflict (id) do update
  set code = excluded.code,
      user_id = excluded.user_id,
      subscription_id = excluded.subscription_id,
      package_id = excluded.package_id,
      package_name = excluded.package_name,
      source = excluded.source,
      status = excluded.status,
      amount_rp = excluded.amount_rp,
      cd_key_id = excluded.cd_key_id,
      paid_at = excluded.paid_at,
      failure_reason = excluded.failure_reason,
      updated_at = now();

  insert into public.app_sessions (
    id, user_id, token_hash, last_seen_at, revoked_at, created_at
  ) values
    ('10000000-0000-0000-0000-000000000001', v_admin_id, 'seed_admin_current', now() - interval '1 minute', null, now() - interval '1 day'),
    ('10000000-0000-0000-0000-000000000002', v_user_a_id, 'seed_user_a_current', now() - interval '2 minutes', null, now() - interval '3 days'),
    ('10000000-0000-0000-0000-000000000003', v_user_a_id, 'seed_user_a_old', now() - interval '10 days', now() - interval '9 days', now() - interval '15 days'),
    ('10000000-0000-0000-0000-000000000004', v_user_b_id, 'seed_user_b_current', now() - interval '3 minutes', null, now() - interval '2 days'),
    ('10000000-0000-0000-0000-000000000005', v_user_c_id, 'seed_user_c_current', now() - interval '5 minutes', null, now() - interval '2 days')
  on conflict (id) do update
  set user_id = excluded.user_id,
      token_hash = excluded.token_hash,
      last_seen_at = excluded.last_seen_at,
      revoked_at = excluded.revoked_at,
      created_at = excluded.created_at;

  insert into public.login_logs (
    id, user_id, email, is_success, failure_reason, ip_address, browser, os, created_at
  ) values
    ('80000000-0000-0000-0000-000000000001', v_admin_id, 'admin@assetnext.dev', true, null, '10.0.0.1', 'Chrome', 'Windows', now() - interval '1 day'),
    ('80000000-0000-0000-0000-000000000002', v_user_a_id, 'user.a@assetnext.dev', false, 'wrong_password', '10.0.0.11', 'Chrome', 'Windows', now() - interval '2 days'),
    ('80000000-0000-0000-0000-000000000003', v_user_a_id, 'user.a@assetnext.dev', true, null, '10.0.0.11', 'Chrome', 'Windows', now() - interval '20 days'),
    ('80000000-0000-0000-0000-000000000004', v_user_b_id, 'user.b@assetnext.dev', false, 'wrong_password', '10.0.0.12', 'Chrome', 'macOS', now() - interval '6 hours'),
    ('80000000-0000-0000-0000-000000000005', v_user_b_id, 'user.b@assetnext.dev', false, 'wrong_password', '10.0.0.12', 'Chrome', 'macOS', now() - interval '5 hours'),
    ('80000000-0000-0000-0000-000000000006', v_user_b_id, 'user.b@assetnext.dev', true, null, '10.0.0.12', 'Chrome', 'macOS', now() - interval '4 hours'),
    ('80000000-0000-0000-0000-000000000007', v_user_c_id, 'user.c@assetnext.dev', true, null, '10.0.0.13', 'Chrome', 'Linux', now() - interval '2 days'),
    ('80000000-0000-0000-0000-000000000008', v_user_d_id, 'user.d@assetnext.dev', true, null, '10.0.0.14', 'Chrome', 'Windows', now() - interval '40 days')
  on conflict (id) do update
  set user_id = excluded.user_id,
      email = excluded.email,
      is_success = excluded.is_success,
      failure_reason = excluded.failure_reason,
      ip_address = excluded.ip_address,
      browser = excluded.browser,
      os = excluded.os,
      created_at = excluded.created_at;

  insert into public.extension_tracks (
    id, user_id, session_id, extension_id, device_id, extension_version, ip_address, city, country, browser, os, first_seen_at, last_seen_at
  ) values
    ('70000000-0000-0000-0000-000000000001', v_user_a_id, '10000000-0000-0000-0000-000000000002', 'ext-dev-001', 'device-user-a-1', '1.0.0', '10.10.0.11', 'Jakarta', 'ID', 'Chrome', 'Windows', now() - interval '7 days', now() - interval '2 minutes'),
    ('70000000-0000-0000-0000-000000000002', v_user_a_id, '10000000-0000-0000-0000-000000000003', 'ext-dev-001', 'device-user-a-1', '0.9.8', '10.10.0.12', 'Bandung', 'ID', 'Chrome', 'Windows', now() - interval '20 days', now() - interval '10 days'),
    ('70000000-0000-0000-0000-000000000003', v_user_b_id, '10000000-0000-0000-0000-000000000004', 'ext-dev-001', 'device-user-b-1', '1.0.0', '10.10.0.21', 'Surabaya', 'ID', 'Chrome', 'macOS', now() - interval '3 days', now() - interval '5 minutes'),
    ('70000000-0000-0000-0000-000000000004', v_user_c_id, '10000000-0000-0000-0000-000000000005', 'ext-dev-001', 'device-user-c-1', '1.0.0', '10.10.0.31', 'Yogyakarta', 'ID', 'Chrome', 'Linux', now() - interval '2 days', now() - interval '8 minutes')
  on conflict (id) do update
  set user_id = excluded.user_id,
      session_id = excluded.session_id,
      extension_id = excluded.extension_id,
      device_id = excluded.device_id,
      extension_version = excluded.extension_version,
      ip_address = excluded.ip_address,
      city = excluded.city,
      country = excluded.country,
      browser = excluded.browser,
      os = excluded.os,
      first_seen_at = excluded.first_seen_at,
      last_seen_at = excluded.last_seen_at;

  update public.subscriptions
  set end_at = now() - interval '10 days',
      updated_at = now()
  where id = '30000000-0000-0000-0000-000000000004';

  perform public.apply_subscription_status('30000000-0000-0000-0000-000000000001');
  perform public.apply_subscription_status('30000000-0000-0000-0000-000000000002');
  perform public.apply_subscription_status('30000000-0000-0000-0000-000000000003');
  perform public.apply_subscription_status('30000000-0000-0000-0000-000000000004');

  perform public.delete_asset_safely('20000000-0000-0000-0000-000000000015');
end
$$;

commit;
