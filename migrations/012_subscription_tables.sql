-- Create subscription, transaction, assignment, and extension runtime tables.
-- These tables store entitlement state after a user buys or redeems access.

begin;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  package_id uuid not null references public.packages(id) on delete restrict,
  package_name text not null,
  access_keys_json jsonb not null,
  status public.subscription_status_enum not null,
  source public.source_enum not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_date_range_valid check (end_at > start_at),
  constraint subscriptions_access_keys_valid check (public.is_valid_access_keys_json(access_keys_json))
);

create unique index subscriptions_one_running_per_user_idx
  on public.subscriptions (user_id)
  where status in ('active', 'processed');

create index subscriptions_user_created_at_idx
  on public.subscriptions (user_id, created_at desc);

create index subscriptions_status_end_at_idx
  on public.subscriptions (status, end_at);

create index subscriptions_package_id_idx
  on public.subscriptions (package_id);

create table public.cd_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  package_id uuid not null references public.packages(id) on delete restrict,
  duration_days integer not null,
  is_extended boolean not null,
  access_keys_json jsonb not null,
  amount_rp bigint not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  used_by uuid references public.profiles(user_id) on delete restrict,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cd_keys_code_unique unique (code),
  constraint cd_keys_amount_non_negative check (amount_rp >= 0),
  constraint cd_keys_duration_positive check (duration_days > 0),
  constraint cd_keys_access_keys_valid check (public.is_valid_access_keys_json(access_keys_json)),
  constraint cd_keys_usage_consistency check (
    (used_by is null and used_at is null) or
    (used_by is not null and used_at is not null)
  )
);

create index cd_keys_package_active_used_idx
  on public.cd_keys (package_id, is_active, used_at);

create index cd_keys_used_by_used_at_idx
  on public.cd_keys (used_by, used_at desc);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  package_id uuid not null references public.packages(id) on delete restrict,
  package_name text not null,
  source public.source_enum not null,
  status public.transaction_status_enum not null,
  amount_rp bigint not null,
  cd_key_id uuid references public.cd_keys(id) on delete set null,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_code_unique unique (code),
  constraint transactions_amount_non_negative check (amount_rp >= 0),
  constraint transactions_paid_at_consistency check (
    (status = 'success'::public.transaction_status_enum and paid_at is not null) or
    (status <> 'success'::public.transaction_status_enum and paid_at is null)
  )
);

create index transactions_user_created_at_idx
  on public.transactions (user_id, created_at desc);

create index transactions_status_source_created_at_idx
  on public.transactions (status, source, created_at desc);

create index transactions_package_id_idx
  on public.transactions (package_id);

create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  asset_id uuid references public.assets(id) on delete set null,
  original_asset_id uuid not null,
  access_key text not null,
  asset_platform public.platform_enum not null,
  asset_type public.asset_type_enum not null,
  asset_note text,
  asset_expires_at timestamptz not null,
  asset_deleted_at timestamptz,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  constraint asset_assignments_access_key_valid check (public.is_valid_access_key(access_key)),
  constraint asset_assignments_revoked_after_assigned check (revoked_at is null or revoked_at >= assigned_at),
  constraint asset_assignments_deleted_after_assigned check (asset_deleted_at is null or asset_deleted_at >= assigned_at)
);

create unique index asset_assignments_one_active_key_per_subscription_idx
  on public.asset_assignments (subscription_id, access_key)
  where revoked_at is null;

create unique index asset_assignments_one_active_private_asset_idx
  on public.asset_assignments (asset_id)
  where revoked_at is null and asset_id is not null and asset_type = 'private'::public.asset_type_enum;

create index asset_assignments_user_revoked_at_idx
  on public.asset_assignments (user_id, revoked_at);

create index asset_assignments_asset_assigned_at_idx
  on public.asset_assignments (asset_id, assigned_at desc);

create index asset_assignments_user_platform_type_active_idx
  on public.asset_assignments (user_id, asset_platform, asset_type)
  where revoked_at is null;

create index asset_assignments_original_asset_id_idx
  on public.asset_assignments (original_asset_id);

create index asset_assignments_subscription_revoked_at_idx
  on public.asset_assignments (subscription_id, revoked_at);

create index asset_assignments_access_key_revoked_at_idx
  on public.asset_assignments (access_key, revoked_at);

create table public.extension_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  session_id uuid references public.app_sessions(id) on delete set null,
  extension_id text not null,
  device_id text not null,
  extension_version text not null,
  ip_address text not null,
  city text,
  country text,
  browser text,
  os text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint extension_tracks_identity_unique unique (user_id, device_id, ip_address, extension_id),
  constraint extension_tracks_seen_order check (last_seen_at >= first_seen_at)
);

create index extension_tracks_user_last_seen_idx
  on public.extension_tracks (user_id, last_seen_at desc);

create index extension_tracks_last_seen_idx
  on public.extension_tracks (last_seen_at desc);

commit;
