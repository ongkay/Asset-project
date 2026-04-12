-- Core business functions for sessions, subscription status, and asset assignment.
-- This is the main backend engine that keeps entitlement data consistent.

begin;

-- Validate every assignment before it is written.
-- This keeps subscription rules and asset rules aligned in one place.
create or replace function public.validate_asset_assignment()
returns trigger
language plpgsql
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_asset public.assets%rowtype;
begin
  if new.asset_id is null then
    return new;
  end if;

  if not public.is_valid_access_key(new.access_key) then
    raise exception 'invalid access_key: %', new.access_key;
  end if;

  select *
  into v_subscription
  from public.subscriptions
  where id = new.subscription_id;

  if not found then
    raise exception 'subscription % not found', new.subscription_id;
  end if;

  if v_subscription.user_id <> new.user_id then
    raise exception 'asset assignment user_id must match subscription owner';
  end if;

  if v_subscription.status in ('expired', 'canceled') then
    raise exception 'cannot assign asset to subscription with status %', v_subscription.status;
  end if;

  if v_subscription.end_at <= now() then
    raise exception 'cannot assign asset to subscription that already ended';
  end if;

  if not (v_subscription.access_keys_json @> jsonb_build_array(new.access_key)) then
    raise exception 'access_key % is not allowed by subscription %', new.access_key, new.subscription_id;
  end if;

  select *
  into v_asset
  from public.assets
  where id = new.asset_id;

  if not found then
    raise exception 'asset % not found', new.asset_id;
  end if;

  if (v_asset.platform::text || ':' || v_asset.asset_type::text) <> new.access_key then
    raise exception 'asset % does not match access_key %', new.asset_id, new.access_key;
  end if;

  if v_asset.disabled_at is not null then
    raise exception 'asset % is disabled', new.asset_id;
  end if;

  if v_asset.expires_at < now() then
    raise exception 'asset % is expired', new.asset_id;
  end if;

  if v_asset.asset_type = 'share'::public.asset_type_enum and exists (
    select 1
    from public.asset_assignments aa
    where aa.user_id = new.user_id
      and aa.asset_platform = v_asset.platform
      and aa.asset_type = 'share'::public.asset_type_enum
      and aa.revoked_at is null
      and (new.id is null or aa.id <> new.id)
  ) then
    raise exception 'user % already has an active share asset on platform %', new.user_id, v_asset.platform;
  end if;

  new.original_asset_id = coalesce(new.original_asset_id, v_asset.id);
  new.asset_platform = v_asset.platform;
  new.asset_type = v_asset.asset_type;
  new.asset_note = v_asset.note;
  new.asset_expires_at = v_asset.expires_at;

  return new;
end;
$$;

-- Revoke any old app session when a new login succeeds.
create or replace function public.revoke_app_sessions(p_user_id uuid)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.app_sessions
  set revoked_at = now()
  where user_id = p_user_id
    and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Pick the best matching asset for one access key and create the assignment.
-- The function returns null when no valid replacement is available.
create or replace function public.assign_best_asset(
  p_subscription_id uuid,
  p_access_key text,
  p_exclude_asset_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_platform public.platform_enum;
  v_asset_type public.asset_type_enum;
  v_asset_id uuid;
begin
  if not public.is_valid_access_key(p_access_key) then
    raise exception 'invalid access_key: %', p_access_key;
  end if;

  select *
  into v_subscription
  from public.subscriptions
  where id = p_subscription_id;

  if not found then
    raise exception 'subscription % not found', p_subscription_id;
  end if;

  if v_subscription.status in ('expired', 'canceled') then
    return null;
  end if;

  if v_subscription.end_at <= now() then
    return null;
  end if;

  select split_part(p_access_key, ':', 1)::public.platform_enum,
         split_part(p_access_key, ':', 2)::public.asset_type_enum
  into v_platform, v_asset_type;

  select aa.asset_id
  into v_asset_id
  from public.asset_assignments aa
  where aa.subscription_id = p_subscription_id
    and aa.access_key = p_access_key
    and aa.revoked_at is null
  limit 1;

  if v_asset_id is not null then
    return v_asset_id;
  end if;

  select a.id
  into v_asset_id
  from public.assets a
  where a.platform = v_platform
    and a.asset_type = v_asset_type
    and a.disabled_at is null
    and a.expires_at >= now()
    and (p_exclude_asset_id is null or a.id <> p_exclude_asset_id)
    and (
      v_asset_type = 'share'::public.asset_type_enum or not exists (
        select 1
        from public.asset_assignments aa
        where aa.asset_id = a.id
          and aa.revoked_at is null
      )
    )
    and (
      v_asset_type <> 'share'::public.asset_type_enum or not exists (
        select 1
        from public.asset_assignments aa
        where aa.user_id = v_subscription.user_id
          and aa.asset_platform = v_platform
          and aa.asset_type = 'share'::public.asset_type_enum
          and aa.revoked_at is null
      )
    )
  order by a.expires_at asc, a.created_at asc
  limit 1;

  if v_asset_id is null then
    return null;
  end if;

  begin
    insert into public.asset_assignments (
      subscription_id,
      user_id,
      asset_id,
      original_asset_id,
      access_key
    )
    values (
      p_subscription_id,
      v_subscription.user_id,
      v_asset_id,
      v_asset_id,
      p_access_key
    );
  exception
    when unique_violation then
      return null;
  end;

  return v_asset_id;
end;
$$;

-- Recalculate whether a subscription is fully assigned, partially assigned, or expired.
create or replace function public.apply_subscription_status(p_subscription_id uuid)
returns public.subscription_status_enum
language plpgsql
as $$
declare
  v_current_status public.subscription_status_enum;
  v_next_status public.subscription_status_enum;
  v_end_at timestamptz;
  v_expected_count integer;
  v_active_count integer;
begin
  select
    status,
    end_at,
    (
      select count(distinct value)
      from jsonb_array_elements_text(access_keys_json)
    )
  into v_current_status, v_end_at, v_expected_count
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'subscription % not found', p_subscription_id;
  end if;

  if v_current_status = 'canceled'::public.subscription_status_enum then
    return v_current_status;
  end if;

  if v_end_at <= now() then
    v_next_status = 'expired'::public.subscription_status_enum;
  else
    select count(distinct access_key)
    into v_active_count
    from public.asset_assignments
    where subscription_id = p_subscription_id
      and revoked_at is null;

    if v_active_count >= v_expected_count then
      v_next_status = 'active'::public.subscription_status_enum;
    else
      v_next_status = 'processed'::public.subscription_status_enum;
    end if;
  end if;

  update public.subscriptions
  set status = v_next_status,
      updated_at = now()
  where id = p_subscription_id;

  if v_next_status = 'expired'::public.subscription_status_enum then
    update public.asset_assignments
    set revoked_at = coalesce(revoked_at, now()),
        revoke_reason = coalesce(revoke_reason, 'subscription_expired')
    where subscription_id = p_subscription_id
      and revoked_at is null;
  end if;

  return v_next_status;
end;
$$;

-- Normalize stale running subscriptions before writing a new running row.
-- This prevents a stale active/processed row with end_at in the past from blocking a valid new row.
create or replace function public.normalize_running_subscriptions_before_write()
returns trigger
language plpgsql
as $$
declare
  v_subscription_id uuid;
begin
  if new.status not in ('active', 'processed') then
    return new;
  end if;

  if new.end_at <= now() then
    new.status := 'expired'::public.subscription_status_enum;
    return new;
  end if;

  for v_subscription_id in
    select s.id
    from public.subscriptions s
    where s.user_id = new.user_id
      and s.status in ('active', 'processed')
      and s.end_at <= now()
      and (tg_op = 'INSERT' or s.id <> new.id)
  loop
    perform public.apply_subscription_status(v_subscription_id);
  end loop;

  return new;
end;
$$;

-- Expire old subscriptions and revoke their live assignments.
-- This function is meant to be called by Next.js cron.
create or replace function public.expire_subscriptions_job()
returns integer
language plpgsql
as $$
declare
  v_subscription_ids uuid[];
  v_count integer := 0;
begin
  with expired_rows as (
    update public.subscriptions
    set status = 'expired'::public.subscription_status_enum,
        updated_at = now()
    where status in ('active', 'processed')
      and end_at <= now()
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[])
  into v_subscription_ids
  from expired_rows;

  v_count := coalesce(array_length(v_subscription_ids, 1), 0);

  if v_count > 0 then
    update public.asset_assignments
    set revoked_at = coalesce(revoked_at, now()),
        revoke_reason = coalesce(revoke_reason, 'subscription_expired')
    where subscription_id = any(v_subscription_ids)
      and revoked_at is null;
  end if;

  return v_count;
end;
$$;

-- Find invalid assets that are still assigned and try to heal affected subscriptions.
create or replace function public.reconcile_invalid_assets_job()
returns integer
language plpgsql
as $$
declare
  v_asset record;
  v_count integer := 0;
begin
  for v_asset in
    select distinct a.id
    from public.assets a
    join public.asset_assignments aa on aa.asset_id = a.id
    join public.subscriptions s on s.id = aa.subscription_id
    where aa.revoked_at is null
      and s.status in ('active', 'processed')
      and s.end_at > now()
      and (a.disabled_at is not null or a.expires_at < now())
  loop
    perform public.recheck_subscription_after_asset_change(v_asset.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Revoke one broken asset, try to replace it, then refresh subscription status.
create or replace function public.recheck_subscription_after_asset_change(p_asset_id uuid)
returns void
language plpgsql
as $$
declare
  v_pair record;
begin
  for v_pair in
    with revoked as (
      update public.asset_assignments
      set revoked_at = coalesce(revoked_at, now()),
          revoke_reason = coalesce(revoke_reason, 'asset_unavailable')
      where asset_id = p_asset_id
        and revoked_at is null
      returning subscription_id, access_key
    )
    select distinct subscription_id, access_key
    from revoked
  loop
    perform public.assign_best_asset(v_pair.subscription_id, v_pair.access_key, p_asset_id);
  end loop;

  perform public.apply_subscription_status(ds.subscription_id)
  from (
    select distinct aa.subscription_id
    from public.asset_assignments aa
    where aa.original_asset_id = p_asset_id
  ) as ds;
end;
$$;

-- Hard delete an asset without losing assignment history snapshots.
create or replace function public.delete_asset_safely(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair record;
begin
  if auth.uid() is not null and not public.is_app_admin() then
    raise exception 'admin access required';
  end if;

  for v_pair in
    with revoked as (
      update public.asset_assignments
      set revoked_at = coalesce(revoked_at, now()),
          revoke_reason = coalesce(revoke_reason, 'asset_deleted')
      where asset_id = p_asset_id
        and revoked_at is null
      returning subscription_id, access_key
    )
    select distinct subscription_id, access_key
    from revoked
  loop
    perform public.assign_best_asset(v_pair.subscription_id, v_pair.access_key, p_asset_id);
  end loop;

  update public.asset_assignments
  set asset_deleted_at = coalesce(asset_deleted_at, now())
  where original_asset_id = p_asset_id;

  perform public.apply_subscription_status(ds.subscription_id)
  from (
    select distinct aa.subscription_id
    from public.asset_assignments aa
    where aa.original_asset_id = p_asset_id
  ) as ds;

  delete from public.assets where id = p_asset_id;
end;
$$;

revoke all on function public.delete_asset_safely(uuid) from public;
grant execute on function public.delete_asset_safely(uuid) to authenticated;

commit;
