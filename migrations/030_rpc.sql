-- Helper RPC and seed helper functions used by the app and local development.
-- Runtime RPCs are grouped here so application-facing SQL stays easy to find.

begin;

-- Turn access_keys_json into a simple label for admin reporting.
create or replace function public.get_package_summary(p_access_keys_json jsonb)
returns text
language plpgsql
immutable
as $$
declare
  v_has_private boolean := false;
  v_has_share boolean := false;
begin
  if p_access_keys_json is null or jsonb_typeof(p_access_keys_json) <> 'array' or jsonb_array_length(p_access_keys_json) = 0 then
    return null;
  end if;

  select
    bool_or(value like '%:private'),
    bool_or(value like '%:share')
  into v_has_private, v_has_share
  from jsonb_array_elements_text(p_access_keys_json) as t(value);

  if coalesce(v_has_private, false) and coalesce(v_has_share, false) then
    return 'mixed';
  elsif coalesce(v_has_private, false) then
    return 'private';
  elsif coalesce(v_has_share, false) then
    return 'share';
  end if;

  return null;
end;
$$;

-- Development helper to insert or update packages by code.
create or replace function public.seed_package(
  p_code text,
  p_name text,
  p_amount_rp bigint,
  p_duration_days integer,
  p_is_extended boolean,
  p_access_keys_json jsonb,
  p_checkout_url text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
begin
  if p_code is null or btrim(p_code) = '' then
    raise exception 'package code is required';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'package name is required';
  end if;

  if p_amount_rp < 0 then
    raise exception 'package amount_rp must be >= 0';
  end if;

  if p_duration_days <= 0 then
    raise exception 'package duration_days must be > 0';
  end if;

  if not public.is_valid_access_keys_json(p_access_keys_json) then
    raise exception 'package access_keys_json is invalid';
  end if;

  insert into public.packages (
    code,
    name,
    amount_rp,
    duration_days,
    is_extended,
    access_keys_json,
    checkout_url,
    is_active
  )
  values (
    p_code,
    p_name,
    p_amount_rp,
    p_duration_days,
    p_is_extended,
    p_access_keys_json,
    p_checkout_url,
    p_is_active
  )
  on conflict (code) do update
  set name = excluded.name,
      amount_rp = excluded.amount_rp,
      duration_days = excluded.duration_days,
      is_extended = excluded.is_extended,
      access_keys_json = excluded.access_keys_json,
      checkout_url = excluded.checkout_url,
      is_active = excluded.is_active,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.seed_package(text, text, bigint, integer, boolean, jsonb, text, boolean) from public;

-- Development helper to insert or update CD-Keys by code.
create or replace function public.seed_cd_key(
  p_code text,
  p_package_id uuid,
  p_duration_days integer,
  p_is_extended boolean,
  p_access_keys_json jsonb,
  p_amount_rp bigint,
  p_created_by uuid,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
begin
  if p_code is null or btrim(p_code) = '' then
    raise exception 'cd_key code is required';
  end if;

  if p_duration_days <= 0 then
    raise exception 'cd_key duration_days must be > 0';
  end if;

  if p_amount_rp < 0 then
    raise exception 'cd_key amount_rp must be >= 0';
  end if;

  if not public.is_valid_access_keys_json(p_access_keys_json) then
    raise exception 'cd_key access_keys_json is invalid';
  end if;

  insert into public.cd_keys (
    code,
    package_id,
    duration_days,
    is_extended,
    access_keys_json,
    amount_rp,
    is_active,
    created_by
  )
  values (
    p_code,
    p_package_id,
    p_duration_days,
    p_is_extended,
    p_access_keys_json,
    p_amount_rp,
    p_is_active,
    p_created_by
  )
  on conflict (code) do update
  set package_id = excluded.package_id,
      duration_days = excluded.duration_days,
      is_extended = excluded.is_extended,
      access_keys_json = excluded.access_keys_json,
      amount_rp = excluded.amount_rp,
      is_active = excluded.is_active,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.seed_cd_key(text, uuid, integer, boolean, jsonb, bigint, uuid, boolean) from public;

-- Upsert the latest heartbeat from one extension installation.
create or replace function public.upsert_extension_track(
  p_extension_id text,
  p_device_id text,
  p_extension_version text,
  p_ip_address text,
  p_city text default null,
  p_country text default null,
  p_browser text default null,
  p_os text default null,
  p_session_id uuid default null,
  p_user_id uuid default null
)
returns public.extension_tracks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_user_id uuid;
  v_row public.extension_tracks;
begin
  v_actor_user_id := auth.uid();
  v_user_id := coalesce(p_user_id, v_actor_user_id);

  if v_user_id is null then
    raise exception 'user_id is required';
  end if;

  if v_actor_user_id is not null
     and v_user_id <> v_actor_user_id
     and not public.is_app_admin() then
    raise exception 'cannot upsert extension track for another user';
  end if;

  if p_extension_id is null or btrim(p_extension_id) = '' then
    raise exception 'extension_id is required';
  end if;

  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception 'device_id is required';
  end if;

  if p_extension_version is null or btrim(p_extension_version) = '' then
    raise exception 'extension_version is required';
  end if;

  if p_ip_address is null or btrim(p_ip_address) = '' then
    raise exception 'ip_address is required';
  end if;

  insert into public.extension_tracks (
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
  )
  values (
    v_user_id,
    p_session_id,
    p_extension_id,
    p_device_id,
    p_extension_version,
    p_ip_address,
    p_city,
    p_country,
    p_browser,
    p_os,
    now(),
    now()
  )
  on conflict (user_id, device_id, ip_address, extension_id) do update
  set session_id = excluded.session_id,
      extension_version = excluded.extension_version,
      city = excluded.city,
      country = excluded.country,
      browser = excluded.browser,
      os = excluded.os,
      last_seen_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_extension_track(text, text, text, text, text, text, text, text, uuid, uuid) from public;
grant execute on function public.upsert_extension_track(text, text, text, text, text, text, text, text, uuid, uuid) to authenticated;

-- Return the exact data needed by the member console in one call.
create or replace function public.get_user_console_snapshot(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_user_id uuid;
  v_subscription jsonb;
  v_assets jsonb;
  v_transactions jsonb;
begin
  v_actor_user_id := auth.uid();
  v_user_id := coalesce(p_user_id, v_actor_user_id);

  if v_user_id is null then
    raise exception 'user_id is required';
  end if;

  if v_actor_user_id is not null
     and v_user_id <> v_actor_user_id
     and not public.is_app_admin() then
    raise exception 'cannot read another user console snapshot';
  end if;

  select to_jsonb(x)
  into v_subscription
  from (
    select
      s.id,
      s.package_id,
      s.package_name,
      s.status,
      s.start_at,
      s.end_at,
      greatest(0, floor(extract(epoch from (s.end_at - now())) / 86400))::int as days_left
    from public.subscriptions s
    where s.user_id = v_user_id
      and s.status in ('active', 'processed')
      and s.end_at > now()
    order by s.created_at desc
    limit 1
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.assigned_at desc), '[]'::jsonb)
  into v_assets
  from (
    select
      aa.asset_id as id,
      aa.subscription_id,
      aa.id as assignment_id,
      aa.access_key,
      a.platform,
      a.asset_type,
      a.note,
      a.proxy,
      a.expires_at,
      aa.assigned_at
    from public.asset_assignments aa
    join public.subscriptions s on s.id = aa.subscription_id
    join public.assets a on a.id = aa.asset_id
    where aa.user_id = v_user_id
      and aa.revoked_at is null
      and s.status in ('active', 'processed')
      and s.end_at > now()
      and a.disabled_at is null
      and a.expires_at >= now()
    order by aa.assigned_at desc
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
  into v_transactions
  from (
    select
      t.id,
      t.code,
      t.package_id,
      t.package_name,
      t.source,
      t.status,
      t.amount_rp,
      t.paid_at,
      t.created_at
    from public.transactions t
    where t.user_id = v_user_id
    order by t.created_at desc
  ) x;

  return jsonb_build_object(
    'subscription', coalesce(v_subscription, 'null'::jsonb),
    'assets', v_assets,
    'transactions', v_transactions
  );
end;
$$;

revoke all on function public.get_user_console_snapshot(uuid) from public;
grant execute on function public.get_user_console_snapshot(uuid) to authenticated;

-- Return raw asset detail only when the actor is allowed to access that active asset right now.
create or replace function public.get_user_asset_detail(
  p_asset_id uuid,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_user_id uuid;
  v_detail jsonb;
begin
  v_actor_user_id := auth.uid();
  v_user_id := coalesce(p_user_id, v_actor_user_id);

  if p_asset_id is null then
    raise exception 'asset_id is required';
  end if;

  if v_user_id is null then
    raise exception 'user_id is required';
  end if;

  if v_actor_user_id is not null
     and v_user_id <> v_actor_user_id
     and not public.is_app_admin() then
    raise exception 'cannot read another user asset detail';
  end if;

  select jsonb_build_object(
    'id', a.id,
    'subscription_id', aa.subscription_id,
    'access_key', aa.access_key,
    'platform', aa.asset_platform,
    'asset_type', aa.asset_type,
    'note', a.note,
    'proxy', a.proxy,
    'expires_at', a.expires_at,
    'account', a.account,
    'asset_json', a.asset_json
  )
  into v_detail
  from public.asset_assignments aa
  join public.subscriptions s on s.id = aa.subscription_id
  join public.assets a on a.id = aa.asset_id
  where aa.user_id = v_user_id
    and aa.asset_id = p_asset_id
    and aa.revoked_at is null
    and s.status in ('active', 'processed')
    and s.end_at > now()
    and a.disabled_at is null
    and a.expires_at >= now()
  limit 1;

  return v_detail;
end;
$$;

revoke all on function public.get_user_asset_detail(uuid, uuid) from public;
grant execute on function public.get_user_asset_detail(uuid, uuid) to authenticated;

-- Return compact admin dashboard totals in one query.
create or replace function public.get_admin_dashboard_stats(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_members bigint;
  v_total_subscribed_members bigint;
  v_total_private_subscriptions bigint;
  v_total_share_subscriptions bigint;
  v_total_mixed_subscriptions bigint;
  v_total_assets bigint;
  v_total_success_amount_rp bigint;
begin
  if auth.uid() is not null and not public.is_app_admin() then
    raise exception 'admin access required';
  end if;

  select count(*)
  into v_total_members
  from public.profiles
  where role = 'member'::public.role_enum;

  select count(distinct user_id)
  into v_total_subscribed_members
  from public.subscriptions
  where status in ('active', 'processed')
    and end_at > now();

  select count(*)
  into v_total_private_subscriptions
  from public.subscriptions
  where status in ('active', 'processed')
    and end_at > now()
    and public.get_package_summary(access_keys_json) = 'private';

  select count(*)
  into v_total_share_subscriptions
  from public.subscriptions
  where status in ('active', 'processed')
    and end_at > now()
    and public.get_package_summary(access_keys_json) = 'share';

  select count(*)
  into v_total_mixed_subscriptions
  from public.subscriptions
  where status in ('active', 'processed')
    and end_at > now()
    and public.get_package_summary(access_keys_json) = 'mixed';

  select count(*)
  into v_total_assets
  from public.assets;

  select coalesce(sum(amount_rp), 0)
  into v_total_success_amount_rp
  from public.transactions
  where status = 'success'::public.transaction_status_enum
    and created_at >= p_from
    and created_at <= p_to;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'totalMembers', v_total_members,
    'totalSubscribedMembers', v_total_subscribed_members,
    'totalPrivateSubscriptions', v_total_private_subscriptions,
    'totalShareSubscriptions', v_total_share_subscriptions,
    'totalMixedSubscriptions', v_total_mixed_subscriptions,
    'totalAssets', v_total_assets,
    'totalSuccessAmountRp', v_total_success_amount_rp
  );
end;
$$;

revoke all on function public.get_admin_dashboard_stats(timestamptz, timestamptz) from public;
grant execute on function public.get_admin_dashboard_stats(timestamptz, timestamptz) to authenticated;

comment on function public.seed_package(text, text, bigint, integer, boolean, jsonb, text, boolean)
  is 'Admin seed helper: insert or update package by code.';

comment on function public.seed_cd_key(text, uuid, integer, boolean, jsonb, bigint, uuid, boolean)
  is 'Admin seed helper: insert or update cd_key by code.';

comment on function public.upsert_extension_track(text, text, text, text, text, text, text, text, uuid, uuid)
  is 'Server/member/admin helper RPC: upsert extension heartbeat by unique identity with internal access checks.';

comment on function public.get_user_console_snapshot(uuid)
  is 'Member/admin helper RPC: returns current valid subscription, valid active asset access, and transaction history for one user with internal access checks.';

comment on function public.get_user_asset_detail(uuid, uuid)
  is 'Member/admin helper RPC: returns raw asset detail only for currently allowed active asset access with internal access checks.';

comment on function public.get_admin_dashboard_stats(timestamptz, timestamptz)
  is 'Admin helper RPC: returns aggregate dashboard stats for the given time range with internal admin check.';

-- Optional manual seed examples.
-- Uncomment and edit values before use in a real environment.
--
-- select public.seed_package(
--   'starter_tv_share',
--   'Starter TradingView Share',
--   100000,
--   30,
--   false,
--   '["tradingview:share"]'::jsonb,
--   null,
--   true
-- );
--
-- select public.seed_package(
--   'combo_pro',
--   'Combo Pro',
--   250000,
--   30,
--   true,
--   '["tradingview:private", "fxreplay:share", "fxtester:private"]'::jsonb,
--   null,
--   true
-- );

commit;
