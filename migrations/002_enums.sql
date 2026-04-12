-- Create enum types used by the core tables.
-- Keeping enums in one file makes table definitions easier to scan.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'role_enum'
  ) then
    create type public.role_enum as enum ('member', 'admin');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'platform_enum'
  ) then
    create type public.platform_enum as enum ('tradingview', 'fxreplay', 'fxtester');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'asset_type_enum'
  ) then
    create type public.asset_type_enum as enum ('private', 'share');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'subscription_status_enum'
  ) then
    create type public.subscription_status_enum as enum ('active', 'processed', 'expired', 'canceled');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'transaction_status_enum'
  ) then
    create type public.transaction_status_enum as enum ('pending', 'success', 'failed', 'canceled');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'source_enum'
  ) then
    create type public.source_enum as enum ('payment_dummy', 'cdkey', 'admin_manual');
  end if;
end
$$;

commit;
