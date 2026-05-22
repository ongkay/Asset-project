-- Seed development checkout vouchers for browser verification and local QA.

begin;

with admin_actor as (
  select user_id
  from public.profiles
  where role = 'admin'
  order by created_at asc
  limit 1
),
semi_60_package as (
  select id
  from public.packages
  where code = 'checkout_semi_60'
  limit 1
)
insert into public.discount_vouchers (
  code,
  scope_type,
  package_id,
  discount_percent,
  max_uses,
  used_count,
  expires_at,
  is_active,
  created_by
)
select *
from (
  select
    'VIP15'::text as code,
    'global'::text as scope_type,
    null::uuid as package_id,
    15::integer as discount_percent,
    null::integer as max_uses,
    0::integer as used_count,
    now() + interval '30 days' as expires_at,
    true as is_active,
    admin_actor.user_id as created_by
  from admin_actor

  union all

  select
    'SEMI60'::text as code,
    'package'::text as scope_type,
    semi_60_package.id as package_id,
    12::integer as discount_percent,
    null::integer as max_uses,
    0::integer as used_count,
    now() + interval '30 days' as expires_at,
    true as is_active,
    admin_actor.user_id as created_by
  from admin_actor
  cross join semi_60_package

  union all

  select
    'LIMITDONE'::text as code,
    'global'::text as scope_type,
    null::uuid as package_id,
    10::integer as discount_percent,
    1::integer as max_uses,
    1::integer as used_count,
    now() + interval '30 days' as expires_at,
    true as is_active,
    admin_actor.user_id as created_by
  from admin_actor
) as seed_rows
on conflict (code) do update
set scope_type = excluded.scope_type,
    package_id = excluded.package_id,
    discount_percent = excluded.discount_percent,
    max_uses = excluded.max_uses,
    used_count = excluded.used_count,
    expires_at = excluded.expires_at,
    is_active = excluded.is_active,
    created_by = excluded.created_by,
    updated_at = now();

commit;
