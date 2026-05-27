-- Add QRIS payment provider metadata to transactions.

begin;

alter type public.source_enum add value if not exists 'payment_qris';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'payment_provider_enum'
  ) then
    create type public.payment_provider_enum as enum ('invoiceku');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'payment_provider_status_enum'
  ) then
    create type public.payment_provider_status_enum as enum ('pending', 'paid', 'failed', 'canceled', 'expired');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'payment_fulfillment_status_enum'
  ) then
    create type public.payment_fulfillment_status_enum as enum ('not_started', 'processing', 'fulfilled', 'failed');
  end if;
end
$$;

alter table public.transactions
  add column if not exists payment_provider public.payment_provider_enum,
  add column if not exists payment_provider_status public.payment_provider_status_enum,
  add column if not exists payment_fulfillment_status public.payment_fulfillment_status_enum,
  add column if not exists provider_invoice_id text,
  add column if not exists provider_expired_at timestamptz,
  add column if not exists provider_payment_url text,
  add column if not exists qris_string text,
  add column if not exists payment_fee_amount_rp bigint,
  add column if not exists payment_received_at timestamptz,
  add column if not exists provider_payload_json jsonb;

alter table public.transactions
  drop constraint if exists transactions_payment_fee_amount_non_negative,
  add constraint transactions_payment_fee_amount_non_negative check (
    payment_fee_amount_rp is null or payment_fee_amount_rp >= 0
  );

create unique index if not exists transactions_provider_invoice_id_unique_idx
  on public.transactions (provider_invoice_id)
  where provider_invoice_id is not null;

create index if not exists transactions_qris_reconcile_idx
  on public.transactions (source, status, payment_provider_status, payment_fulfillment_status, provider_expired_at desc)
  where source = 'payment_qris'::public.source_enum;

commit;
