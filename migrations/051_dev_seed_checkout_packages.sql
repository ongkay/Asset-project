-- Seed the active checkout catalog packages after checkout pricing columns exist.

begin;

update public.packages
set is_active = false,
    updated_at = now()
where code not in (
  'checkout_semi_30',
  'checkout_semi_60',
  'checkout_semi_180',
  'checkout_semi_360',
  'checkout_full_15',
  'checkout_full_30'
);

insert into public.packages (
  code,
  name,
  amount_rp,
  list_amount_rp,
  duration_days,
  is_extended,
  access_keys_json,
  checkout_url,
  checkout_group,
  sort_order,
  is_active
)
values
  (
    'checkout_semi_30',
    'Semi Private 30 days',
    76000,
    80000,
    30,
    true,
    '["tradingview:share", "fxtester:share"]'::jsonb,
    null,
    'semi-private',
    10,
    true
  ),
  (
    'checkout_semi_60',
    'Semi Private 60 days',
    128000,
    160000,
    60,
    true,
    '["tradingview:share", "fxtester:share"]'::jsonb,
    null,
    'semi-private',
    20,
    true
  ),
  (
    'checkout_semi_180',
    'Semi Private 180 days',
    336000,
    480000,
    180,
    true,
    '["tradingview:share", "fxtester:share"]'::jsonb,
    null,
    'semi-private',
    30,
    true
  ),
  (
    'checkout_semi_360',
    'Semi Private 360 days',
    576000,
    960000,
    360,
    true,
    '["tradingview:share", "fxtester:share"]'::jsonb,
    null,
    'semi-private',
    40,
    true
  ),
  (
    'checkout_full_15',
    'Full Private 15 days',
    100000,
    125000,
    15,
    true,
    '["tradingview:private", "fxtester:private"]'::jsonb,
    null,
    'full-private',
    10,
    true
  ),
  (
    'checkout_full_30',
    'Full Private 30 days',
    175000,
    250000,
    30,
    true,
    '["tradingview:private", "fxtester:private"]'::jsonb,
    null,
    'full-private',
    20,
    true
  )
on conflict (code) do update
set name = excluded.name,
    amount_rp = excluded.amount_rp,
    list_amount_rp = excluded.list_amount_rp,
    duration_days = excluded.duration_days,
    is_extended = excluded.is_extended,
    access_keys_json = excluded.access_keys_json,
    checkout_url = excluded.checkout_url,
    checkout_group = excluded.checkout_group,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

commit;
