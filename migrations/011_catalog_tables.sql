-- Create package and asset catalog tables.
-- Packages are products, while assets are the actual inventory to be assigned.

begin;

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  amount_rp bigint not null,
  duration_days integer not null,
  is_extended boolean not null,
  access_keys_json jsonb not null,
  checkout_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_code_unique unique (code),
  constraint packages_amount_non_negative check (amount_rp >= 0),
  constraint packages_duration_positive check (duration_days > 0),
  constraint packages_access_keys_valid check (public.is_valid_access_keys_json(access_keys_json))
);

create index packages_is_active_idx on public.packages (is_active);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  platform public.platform_enum not null,
  asset_type public.asset_type_enum not null,
  account text not null,
  proxy text,
  note text,
  asset_json jsonb not null,
  expires_at timestamptz not null,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_asset_json_type_valid check (jsonb_typeof(asset_json) in ('array', 'object'))
);

create index assets_lookup_idx
  on public.assets (platform, asset_type, expires_at, disabled_at);

create index assets_created_at_idx
  on public.assets (created_at desc);

commit;
