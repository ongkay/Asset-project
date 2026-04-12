-- Read models used by the app and admin dashboard.
-- Views keep common query filters in one place.

begin;

-- Only subscriptions that are still running belong here.
create or replace view public.v_current_subscriptions as
select
  s.user_id,
  s.id as subscription_id,
  s.package_id,
  s.package_name,
  s.status,
  s.start_at,
  s.end_at
from public.subscriptions s
where s.status in ('active', 'processed')
  and s.end_at > now();

-- Only asset access that is still valid right now belongs here.
create or replace view public.v_current_asset_access as
select
  aa.user_id,
  aa.subscription_id,
  aa.asset_id,
  aa.access_key,
  a.platform,
  a.asset_type,
  a.note,
  a.proxy,
  a.expires_at,
  s.status as subscription_status,
  s.end_at as subscription_end_at
from public.asset_assignments aa
join public.assets a on a.id = aa.asset_id
join public.subscriptions s on s.id = aa.subscription_id
where aa.revoked_at is null
  and s.status in ('active', 'processed')
  and s.end_at > now()
  and a.disabled_at is null
  and a.expires_at >= now();

create or replace view public.v_asset_status as
with active_usage as (
  select
    aa.asset_id,
    count(*) as active_use
  from public.asset_assignments aa
  where aa.asset_id is not null
    and aa.revoked_at is null
  group by aa.asset_id
)
select
  a.id as asset_id,
  a.platform,
  a.asset_type,
  a.expires_at,
  a.disabled_at,
  coalesce(au.active_use, 0) as active_use,
  case
    when a.disabled_at is not null then 'disabled'
    when a.expires_at < now() then 'expired'
    when a.asset_type = 'private'::public.asset_type_enum and coalesce(au.active_use, 0) > 0 then 'assigned'
    else 'available'
  end as status
from public.assets a
left join active_usage au on au.asset_id = a.id;

create or replace view public.v_live_users as
with session_activity as (
  select user_id, max(last_seen_at) as session_last_seen_at
  from public.app_sessions
  where revoked_at is null
  group by user_id
), extension_activity as (
  select user_id, max(last_seen_at) as extension_last_seen_at
  from public.extension_tracks
  group by user_id
)
select
  p.user_id,
  p.username,
  p.email,
  sa.session_last_seen_at,
  ea.extension_last_seen_at,
  greatest(
    coalesce(sa.session_last_seen_at, '-infinity'::timestamptz),
    coalesce(ea.extension_last_seen_at, '-infinity'::timestamptz)
  ) as last_seen_at
from public.profiles p
left join session_activity sa on sa.user_id = p.user_id
left join extension_activity ea on ea.user_id = p.user_id;

create or replace view public.v_transaction_list as
select
  t.id as transaction_id,
  t.user_id,
  p.username,
  p.email,
  t.package_id,
  t.package_name,
  t.source,
  t.status,
  t.amount_rp,
  t.created_at,
  t.updated_at,
  t.paid_at
from public.transactions t
join public.profiles p on p.user_id = t.user_id;

commit;
