-- Loginable development seed for browser testing.
-- Depends on 040_dev_seed_full.sql because this migration reuses its package fixtures.
-- Shared password for all accounts below: Devpass123
--
-- Accounts created by this seed:
--   seed.admin.browser@assetnext.dev
--   seed.active.browser@assetnext.dev
--   seed.processed.browser@assetnext.dev
--   seed.expired.browser@assetnext.dev
--   seed.canceled.browser@assetnext.dev
--   seed.none.browser@assetnext.dev

begin;

do $$
declare
  v_shared_password_hash text := crypt('Devpass123', gen_salt('bf', 10));
  v_paket_1 uuid;
  v_paket_2 uuid;
  v_paket_3 uuid;
begin
  select id into v_paket_1 from public.packages where code = 'paket_1';
  select id into v_paket_2 from public.packages where code = 'paket_2';
  select id into v_paket_3 from public.packages where code = 'paket_3';

  if v_paket_1 is null or v_paket_2 is null or v_paket_3 is null then
    raise exception 'required packages are missing; apply 040_dev_seed_full.sql before 041_dev_seed_loginable_users.sql';
  end if;

  delete from public.extension_tracks
  where user_id in (
    select user_id
    from public.profiles
    where email like 'seed.%.browser@assetnext.dev'
  );

  delete from public.login_logs
  where user_id in (
    select user_id
    from public.profiles
    where email like 'seed.%.browser@assetnext.dev'
  )
     or email like 'seed.%.browser@assetnext.dev';

  delete from public.app_sessions
  where user_id in (
    select user_id
    from public.profiles
    where email like 'seed.%.browser@assetnext.dev'
  );

  delete from public.asset_assignments
  where user_id in (
    select user_id
    from public.profiles
    where email like 'seed.%.browser@assetnext.dev'
  );

  delete from public.transactions
  where user_id in (
    select user_id
    from public.profiles
    where email like 'seed.%.browser@assetnext.dev'
  );

  delete from public.subscriptions
  where user_id in (
    select user_id
    from public.profiles
    where email like 'seed.%.browser@assetnext.dev'
  );

  delete from public.profiles
  where email like 'seed.%.browser@assetnext.dev';

  delete from auth.users
  where email like 'seed.%.browser@assetnext.dev';

  delete from public.assets
  where id in (
    '21000000-0000-4000-8000-000000000001',
    '21000000-0000-4000-8000-000000000002',
    '21000000-0000-4000-8000-000000000003',
    '21000000-0000-4000-8000-000000000004'
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
    ('91000000-0000-4000-8000-000000000001', 'seed.admin.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '14 days', now(), jsonb_build_object('name', 'Seed Browser Admin'), jsonb_build_object('seed', true, 'kind', 'browser_admin'), true, false),
    ('91000000-0000-4000-8000-000000000002', 'seed.active.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '12 days', now(), jsonb_build_object('name', 'Seed Browser Active'), jsonb_build_object('seed', true, 'kind', 'browser_member_active'), false, false),
    ('91000000-0000-4000-8000-000000000003', 'seed.processed.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '11 days', now(), jsonb_build_object('name', 'Seed Browser Processed'), jsonb_build_object('seed', true, 'kind', 'browser_member_processed'), false, false),
    ('91000000-0000-4000-8000-000000000004', 'seed.expired.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '10 days', now(), jsonb_build_object('name', 'Seed Browser Expired'), jsonb_build_object('seed', true, 'kind', 'browser_member_expired'), false, false),
    ('91000000-0000-4000-8000-000000000005', 'seed.canceled.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '9 days', now(), jsonb_build_object('name', 'Seed Browser Canceled'), jsonb_build_object('seed', true, 'kind', 'browser_member_canceled'), false, false),
    ('91000000-0000-4000-8000-000000000006', 'seed.none.browser@assetnext.dev', v_shared_password_hash, true, now() - interval '8 days', now(), jsonb_build_object('name', 'Seed Browser None'), jsonb_build_object('seed', true, 'kind', 'browser_member_none'), false, false);

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
    ('91000000-0000-4000-8000-000000000001', 'seed.admin.browser@assetnext.dev', 'seed-admin-browser', 'ADM-BRW-01', null, 'admin', false, null),
    ('91000000-0000-4000-8000-000000000002', 'seed.active.browser@assetnext.dev', 'seed-active-browser', 'MEM-BRW-01', null, 'member', false, null),
    ('91000000-0000-4000-8000-000000000003', 'seed.processed.browser@assetnext.dev', 'seed-processed-browser', 'MEM-BRW-02', null, 'member', false, null),
    ('91000000-0000-4000-8000-000000000004', 'seed.expired.browser@assetnext.dev', 'seed-expired-browser', 'MEM-BRW-03', null, 'member', false, null),
    ('91000000-0000-4000-8000-000000000005', 'seed.canceled.browser@assetnext.dev', 'seed-canceled-browser', 'MEM-BRW-04', null, 'member', false, null),
    ('91000000-0000-4000-8000-000000000006', 'seed.none.browser@assetnext.dev', 'seed-none-browser', 'MEM-BRW-05', null, 'member', false, null);

  insert into public.assets (
    id,
    platform,
    asset_type,
    account,
    proxy,
    note,
    asset_json,
    expires_at,
    disabled_at
  ) values
    ('21000000-0000-4000-8000-000000000001', 'tradingview', 'share', 'seed-browser-tv-share-active@assetnext.dev', 'http://proxy.seed.browser.tv.active', 'seed_browser_tv_share_active', '[{"name":"session","value":"seed-browser-tv-active"}]'::jsonb, now() + interval '90 days', null),
    ('21000000-0000-4000-8000-000000000002', 'tradingview', 'share', 'seed-browser-tv-share-processed@assetnext.dev', 'http://proxy.seed.browser.tv.processed', 'seed_browser_tv_share_processed', '[{"name":"session","value":"seed-browser-tv-processed"}]'::jsonb, now() + interval '90 days', null),
    ('21000000-0000-4000-8000-000000000003', 'tradingview', 'share', 'seed-browser-tv-share-expired@assetnext.dev', 'http://proxy.seed.browser.tv.expired', 'seed_browser_tv_share_expired', '[{"name":"session","value":"seed-browser-tv-expired"}]'::jsonb, now() + interval '90 days', null),
    ('21000000-0000-4000-8000-000000000004', 'fxreplay', 'private', 'seed-browser-fx-private-canceled@assetnext.dev', 'http://proxy.seed.browser.fx.canceled', 'seed_browser_fx_private_canceled', '[{"name":"session","value":"seed-browser-fx-canceled"}]'::jsonb, now() + interval '90 days', null);

  insert into public.subscriptions (
    id,
    user_id,
    package_id,
    package_name,
    access_keys_json,
    status,
    source,
    start_at,
    end_at,
    cancel_reason,
    created_at,
    updated_at
  ) values
    ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', v_paket_3, 'Paket 3', '["tradingview:share"]'::jsonb, 'processed', 'payment_dummy', now() - interval '9 days', now() + interval '21 days', null, now() - interval '9 days', now()),
    ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000003', v_paket_2, 'Paket 2', '["tradingview:share", "fxreplay:private"]'::jsonb, 'processed', 'admin_manual', now() - interval '6 days', now() + interval '24 days', null, now() - interval '6 days', now()),
    ('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000004', v_paket_3, 'Paket 3', '["tradingview:share"]'::jsonb, 'processed', 'payment_dummy', now() - interval '40 days', now() + interval '1 day', null, now() - interval '40 days', now()),
    ('92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000005', v_paket_2, 'Paket 2', '["tradingview:share", "fxreplay:private"]'::jsonb, 'processed', 'admin_manual', now() - interval '20 days', now() + interval '5 days', null, now() - interval '20 days', now());

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
    ('94000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'tradingview:share', 'tradingview', 'share', 'seed_browser_tv_share_active', now() + interval '90 days', null, now() - interval '9 days', null, null),
    ('94000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'tradingview:share', 'tradingview', 'share', 'seed_browser_tv_share_processed', now() + interval '90 days', null, now() - interval '6 days', null, null),
    ('94000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000003', 'tradingview:share', 'tradingview', 'share', 'seed_browser_tv_share_expired', now() + interval '90 days', null, now() - interval '40 days', null, null),
    ('94000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000005', '21000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000004', 'fxreplay:private', 'fxreplay', 'private', 'seed_browser_fx_private_canceled', now() + interval '90 days', null, now() - interval '19 days', now() - interval '4 days', 'admin_canceled');

  insert into public.transactions (
    id,
    code,
    user_id,
    subscription_id,
    package_id,
    package_name,
    source,
    status,
    amount_rp,
    cd_key_id,
    paid_at,
    failure_reason,
    created_at,
    updated_at
  ) values
    ('93000000-0000-4000-8000-000000000001', 'TX-SEED-BRW-0001', '91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', v_paket_3, 'Paket 3', 'payment_dummy', 'success', 100000, null, now() - interval '9 days', null, now() - interval '9 days', now()),
    ('93000000-0000-4000-8000-000000000002', 'TX-SEED-BRW-0002', '91000000-0000-4000-8000-000000000002', null, v_paket_1, 'Paket 1', 'payment_dummy', 'failed', 250000, null, null, 'card_declined', now() - interval '15 days', now()),
    ('93000000-0000-4000-8000-000000000003', 'TX-SEED-BRW-0003', '91000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000002', v_paket_2, 'Paket 2', 'admin_manual', 'success', 150000, null, now() - interval '6 days', null, now() - interval '6 days', now()),
    ('93000000-0000-4000-8000-000000000004', 'TX-SEED-BRW-0004', '91000000-0000-4000-8000-000000000003', null, v_paket_2, 'Paket 2', 'payment_dummy', 'pending', 150000, null, null, null, now() - interval '2 days', now()),
    ('93000000-0000-4000-8000-000000000005', 'TX-SEED-BRW-0005', '91000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000003', v_paket_3, 'Paket 3', 'payment_dummy', 'success', 100000, null, now() - interval '40 days', null, now() - interval '40 days', now()),
    ('93000000-0000-4000-8000-000000000006', 'TX-SEED-BRW-0006', '91000000-0000-4000-8000-000000000005', '92000000-0000-4000-8000-000000000004', v_paket_2, 'Paket 2', 'admin_manual', 'success', 150000, null, now() - interval '20 days', null, now() - interval '20 days', now()),
    ('93000000-0000-4000-8000-000000000007', 'TX-SEED-BRW-0007', '91000000-0000-4000-8000-000000000005', null, v_paket_2, 'Paket 2', 'payment_dummy', 'canceled', 150000, null, null, 'user_canceled', now() - interval '25 days', now()),
    ('93000000-0000-4000-8000-000000000008', 'TX-SEED-BRW-0008', '91000000-0000-4000-8000-000000000006', null, v_paket_3, 'Paket 3', 'payment_dummy', 'pending', 100000, null, null, null, now() - interval '3 days', now()),
    ('93000000-0000-4000-8000-000000000009', 'TX-SEED-BRW-0009', '91000000-0000-4000-8000-000000000006', null, v_paket_1, 'Paket 1', 'payment_dummy', 'failed', 250000, null, null, 'payment_failed', now() - interval '12 days', now());

  insert into public.app_sessions (
    id,
    user_id,
    token_hash,
    last_seen_at,
    revoked_at,
    created_at
  ) values
    ('95000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'seed_browser_admin_prev', now() - interval '10 days', now() - interval '9 days', now() - interval '11 days'),
    ('95000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'seed_browser_active_prev', now() - interval '6 days', now() - interval '5 days', now() - interval '8 days'),
    ('95000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000003', 'seed_browser_processed_prev', now() - interval '4 days', now() - interval '3 days', now() - interval '7 days'),
    ('95000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000004', 'seed_browser_expired_prev', now() - interval '18 days', now() - interval '17 days', now() - interval '20 days'),
    ('95000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000005', 'seed_browser_canceled_prev', now() - interval '14 days', now() - interval '13 days', now() - interval '16 days'),
    ('95000000-0000-4000-8000-000000000006', '91000000-0000-4000-8000-000000000006', 'seed_browser_none_prev', now() - interval '2 days', now() - interval '1 day', now() - interval '4 days');

  insert into public.login_logs (
    id,
    user_id,
    email,
    is_success,
    failure_reason,
    ip_address,
    browser,
    os,
    created_at
  ) values
    ('97000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'seed.admin.browser@assetnext.dev', true, null, '10.50.0.1', 'Chrome', 'Windows', now() - interval '9 days'),
    ('97000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'seed.active.browser@assetnext.dev', false, 'wrong_password', '10.50.0.11', 'Chrome', 'Windows', now() - interval '10 days'),
    ('97000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000002', 'seed.active.browser@assetnext.dev', true, null, '10.50.0.11', 'Chrome', 'Windows', now() - interval '9 days'),
    ('97000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000003', 'seed.processed.browser@assetnext.dev', false, 'wrong_password', '10.50.0.12', 'Chrome', 'macOS', now() - interval '7 days'),
    ('97000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000003', 'seed.processed.browser@assetnext.dev', true, null, '10.50.0.12', 'Chrome', 'macOS', now() - interval '6 days'),
    ('97000000-0000-4000-8000-000000000006', '91000000-0000-4000-8000-000000000004', 'seed.expired.browser@assetnext.dev', true, null, '10.50.0.13', 'Chrome', 'Linux', now() - interval '40 days'),
    ('97000000-0000-4000-8000-000000000007', '91000000-0000-4000-8000-000000000005', 'seed.canceled.browser@assetnext.dev', true, null, '10.50.0.14', 'Chrome', 'Windows', now() - interval '20 days'),
    ('97000000-0000-4000-8000-000000000008', '91000000-0000-4000-8000-000000000006', 'seed.none.browser@assetnext.dev', false, 'wrong_password', '10.50.0.15', 'Safari', 'macOS', now() - interval '5 days'),
    ('97000000-0000-4000-8000-000000000009', '91000000-0000-4000-8000-000000000006', 'seed.none.browser@assetnext.dev', false, 'wrong_password', '10.50.0.15', 'Safari', 'macOS', now() - interval '4 days');

  insert into public.extension_tracks (
    id,
    user_id,
    session_id,
    extension_id,
    device_id,
    extension_version,
    ip_address,
    city,
    country,
    browser,
    os,
    first_seen_at,
    last_seen_at
  ) values
    ('96000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', '95000000-0000-4000-8000-000000000002', 'ext-browser-seed', 'device-seed-active-1', '1.0.0', '10.60.0.11', 'Jakarta', 'ID', 'Chrome', 'Windows', now() - interval '8 days', now() - interval '5 days'),
    ('96000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000003', '95000000-0000-4000-8000-000000000003', 'ext-browser-seed', 'device-seed-processed-1', '1.0.0', '10.60.0.12', 'Bandung', 'ID', 'Chrome', 'macOS', now() - interval '7 days', now() - interval '3 days'),
    ('96000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000004', '95000000-0000-4000-8000-000000000004', 'ext-browser-seed', 'device-seed-expired-1', '0.9.9', '10.60.0.13', 'Surabaya', 'ID', 'Chrome', 'Linux', now() - interval '20 days', now() - interval '17 days'),
    ('96000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000005', '95000000-0000-4000-8000-000000000005', 'ext-browser-seed', 'device-seed-canceled-1', '0.9.8', '10.60.0.14', 'Semarang', 'ID', 'Chrome', 'Windows', now() - interval '16 days', now() - interval '13 days'),
    ('96000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000006', '95000000-0000-4000-8000-000000000006', 'ext-browser-seed', 'device-seed-none-1', '1.0.0', '10.60.0.15', 'Yogyakarta', 'ID', 'Safari', 'macOS', now() - interval '4 days', now() - interval '1 day');

  update public.subscriptions
  set end_at = now() - interval '7 days',
      updated_at = now()
  where id = '92000000-0000-4000-8000-000000000003';

  update public.subscriptions
  set status = 'canceled',
      end_at = now() - interval '5 days',
      cancel_reason = 'admin_canceled_for_browser_seed',
      updated_at = now()
  where id = '92000000-0000-4000-8000-000000000004';

  perform public.apply_subscription_status('92000000-0000-4000-8000-000000000001');
  perform public.apply_subscription_status('92000000-0000-4000-8000-000000000002');
  perform public.apply_subscription_status('92000000-0000-4000-8000-000000000003');
end
$$;

commit;
