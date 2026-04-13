-- Transactional activation helper for payment dummy, CD-Key, and admin manual flows.
-- This keeps subscription, assignment, transaction, and CD-Key usage consistent.

begin;

create or replace function public.activate_subscription_v1(
  p_user_id uuid,
  p_source public.source_enum,
  p_package_id uuid default null,
  p_cd_key_code text default null,
  p_amount_override_rp bigint default null,
  p_cancel_reason text default 'replaced_by_new_activation',
  p_activated_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cd_key public.cd_keys%rowtype;
  v_package public.packages%rowtype;
  v_running public.subscriptions%rowtype;
  v_expired_subscription_ids uuid[];
  v_access_key text;
  v_amount_rp bigint;
  v_cancel_reason text;
  v_duration_days integer;
  v_is_extended boolean;
  v_next_running_subscription_id uuid;
  v_package_id uuid;
  v_package_name text;
  v_previous_running_subscription_id uuid;
  v_subscription_status public.subscription_status_enum;
  v_target_access_keys_json jsonb;
  v_transaction_code text;
  v_transaction_created_at timestamptz;
  v_transaction_id uuid;
  v_window_base timestamptz;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_amount_override_rp is not null and p_amount_override_rp < 0 then
    raise exception 'amount_override_rp must be >= 0';
  end if;

  v_cancel_reason := coalesce(nullif(btrim(p_cancel_reason), ''), 'replaced_by_new_activation');

  with expired_rows as (
    update public.subscriptions
    set status = 'expired'::public.subscription_status_enum,
        updated_at = now()
    where user_id = p_user_id
      and status in ('active', 'processed')
      and end_at <= now()
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[])
  into v_expired_subscription_ids
  from expired_rows;

  if coalesce(array_length(v_expired_subscription_ids, 1), 0) > 0 then
    update public.asset_assignments
    set revoked_at = coalesce(revoked_at, now()),
        revoke_reason = coalesce(revoke_reason, 'subscription_expired')
    where subscription_id = any(v_expired_subscription_ids)
      and revoked_at is null;
  end if;

  if p_source = 'cdkey'::public.source_enum then
    if p_cd_key_code is null or btrim(p_cd_key_code) = '' then
      raise exception 'cd_key_code is required for cdkey activation';
    end if;

    select *
    into v_cd_key
    from public.cd_keys
    where code = p_cd_key_code
    for update;

    if not found then
      raise exception 'cd_key not found';
    end if;

    if not v_cd_key.is_active then
      raise exception 'cd_key is not active';
    end if;

    if v_cd_key.used_at is not null then
      raise exception 'cd_key already used';
    end if;

    select *
    into v_package
    from public.packages
    where id = v_cd_key.package_id;

    if not found then
      raise exception 'package % not found for cd_key', v_cd_key.package_id;
    end if;

    v_package_id := v_cd_key.package_id;
    v_package_name := v_package.name;
    v_duration_days := v_cd_key.duration_days;
    v_is_extended := v_cd_key.is_extended;
    v_target_access_keys_json := v_cd_key.access_keys_json;
    v_amount_rp := coalesce(p_amount_override_rp, v_cd_key.amount_rp);
  else
    if p_package_id is null then
      raise exception 'package_id is required for non-cdkey activation';
    end if;

    select *
    into v_package
    from public.packages
    where id = p_package_id;

    if not found then
      raise exception 'package % not found', p_package_id;
    end if;

    if not v_package.is_active then
      raise exception 'package % is not active', p_package_id;
    end if;

    v_package_id := v_package.id;
    v_package_name := v_package.name;
    v_duration_days := v_package.duration_days;
    v_is_extended := v_package.is_extended;
    v_target_access_keys_json := v_package.access_keys_json;
    v_amount_rp := coalesce(p_amount_override_rp, v_package.amount_rp);
  end if;

  select *
  into v_running
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'processed')
    and end_at > now()
  order by created_at desc
  limit 1
  for update;

  if found then
    v_previous_running_subscription_id := v_running.id;
  else
    v_previous_running_subscription_id := null;
  end if;

  if v_previous_running_subscription_id is null then
    insert into public.subscriptions (
      user_id,
      package_id,
      package_name,
      access_keys_json,
      status,
      source,
      start_at,
      end_at
    )
    values (
      p_user_id,
      v_package_id,
      v_package_name,
      v_target_access_keys_json,
      'processed'::public.subscription_status_enum,
      p_source,
      p_activated_at,
      p_activated_at + make_interval(days => v_duration_days)
    )
    returning id into v_next_running_subscription_id;
  elsif v_is_extended and v_running.package_id = v_package_id then
    v_window_base := greatest(v_running.end_at, p_activated_at);

    update public.subscriptions
    set end_at = v_window_base + make_interval(days => v_duration_days),
        source = p_source,
        updated_at = now()
    where id = v_running.id;

    v_next_running_subscription_id := v_running.id;
  else
    if v_is_extended then
      v_window_base := greatest(v_running.end_at, p_activated_at);
    else
      v_window_base := p_activated_at;
    end if;

    update public.subscriptions
    set cancel_reason = v_cancel_reason,
        status = 'canceled'::public.subscription_status_enum,
        updated_at = now()
    where id = v_running.id
      and status in ('active', 'processed');

    update public.asset_assignments
    set revoked_at = coalesce(revoked_at, now()),
        revoke_reason = coalesce(revoke_reason, v_cancel_reason)
    where subscription_id = v_running.id
      and revoked_at is null;

    insert into public.subscriptions (
      user_id,
      package_id,
      package_name,
      access_keys_json,
      status,
      source,
      start_at,
      end_at
    )
    values (
      p_user_id,
      v_package_id,
      v_package_name,
      v_target_access_keys_json,
      'processed'::public.subscription_status_enum,
      p_source,
      p_activated_at,
      v_window_base + make_interval(days => v_duration_days)
    )
    returning id into v_next_running_subscription_id;
  end if;

  for v_access_key in
    select distinct value
    from jsonb_array_elements_text(v_target_access_keys_json)
  loop
    perform public.assign_best_asset(v_next_running_subscription_id, v_access_key);
  end loop;

  v_subscription_status := public.apply_subscription_status(v_next_running_subscription_id);
  v_transaction_code := format('TRX-%s', upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)));

  insert into public.transactions (
    code,
    user_id,
    subscription_id,
    package_id,
    package_name,
    source,
    status,
    amount_rp,
    cd_key_id,
    paid_at
  )
  values (
    v_transaction_code,
    p_user_id,
    v_next_running_subscription_id,
    v_package_id,
    v_package_name,
    p_source,
    'success'::public.transaction_status_enum,
    v_amount_rp,
    case when p_source = 'cdkey'::public.source_enum then v_cd_key.id else null end,
    now()
  )
  returning id, created_at
  into v_transaction_id, v_transaction_created_at;

  if p_source = 'cdkey'::public.source_enum then
    update public.cd_keys
    set used_by = p_user_id,
        used_at = now()
    where id = v_cd_key.id
      and used_at is null;

    if not found then
      raise exception 'cd_key is no longer available';
    end if;
  end if;

  return jsonb_build_object(
    'nextRunningSubscriptionId', v_next_running_subscription_id,
    'previousRunningSubscriptionId', v_previous_running_subscription_id,
    'subscriptionStatus', v_subscription_status,
    'transaction', jsonb_build_object(
      'id', v_transaction_id,
      'code', v_transaction_code,
      'userId', p_user_id,
      'subscriptionId', v_next_running_subscription_id,
      'packageId', v_package_id,
      'packageName', v_package_name,
      'source', p_source,
      'status', 'success',
      'amountRp', v_amount_rp,
      'createdAt', v_transaction_created_at
    )
  );
end;
$$;

revoke all on function public.activate_subscription_v1(uuid, public.source_enum, uuid, text, bigint, text, timestamptz) from public;
grant execute on function public.activate_subscription_v1(uuid, public.source_enum, uuid, text, bigint, text, timestamptz) to authenticated;

comment on function public.activate_subscription_v1(uuid, public.source_enum, uuid, text, bigint, text, timestamptz)
  is 'Server/admin helper RPC: activate subscription from payment dummy, CD-Key, or admin manual in one DB transaction.';

commit;
