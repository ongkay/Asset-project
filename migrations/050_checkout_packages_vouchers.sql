-- Extend packages for checkout pricing, add voucher backend, and store pricing snapshots on transactions.

begin;

alter table public.packages
  add column if not exists list_amount_rp bigint,
  add column if not exists checkout_group text,
  add column if not exists sort_order integer not null default 0;

update public.packages
set list_amount_rp = amount_rp
where list_amount_rp is null;

update public.packages
set checkout_group = 'legacy'
where checkout_group is null;

alter table public.packages
  alter column list_amount_rp set not null,
  alter column checkout_group set not null;

alter table public.packages
  add constraint packages_list_amount_non_negative check (list_amount_rp >= 0);

alter table public.packages
  add constraint packages_sort_order_non_negative check (sort_order >= 0);

create index if not exists packages_checkout_group_sort_order_idx
  on public.packages (checkout_group, sort_order, created_at desc);

create table if not exists public.discount_vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  scope_type text not null,
  package_id uuid references public.packages(id) on delete restrict,
  discount_percent integer not null,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_vouchers_code_unique unique (code),
  constraint discount_vouchers_scope_type_valid check (scope_type in ('global', 'package')),
  constraint discount_vouchers_percent_range check (discount_percent > 0 and discount_percent <= 100),
  constraint discount_vouchers_max_uses_positive check (max_uses is null or max_uses > 0),
  constraint discount_vouchers_used_count_non_negative check (used_count >= 0),
  constraint discount_vouchers_scope_consistency check (
    (scope_type = 'global' and package_id is null) or
    (scope_type = 'package' and package_id is not null)
  ),
  constraint discount_vouchers_usage_bound check (max_uses is null or used_count <= max_uses)
);

create index if not exists discount_vouchers_is_active_idx
  on public.discount_vouchers (is_active, expires_at);

create index if not exists discount_vouchers_package_id_idx
  on public.discount_vouchers (package_id);

create index if not exists discount_vouchers_scope_type_idx
  on public.discount_vouchers (scope_type);

create or replace function public.consume_discount_voucher_usage(p_voucher_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumed_id uuid;
begin
  update public.discount_vouchers
  set used_count = used_count + 1
  where id = p_voucher_id
    and is_active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  returning id into v_consumed_id;

  return v_consumed_id is not null;
end;
$$;

revoke all on function public.consume_discount_voucher_usage(uuid) from public;
grant execute on function public.consume_discount_voucher_usage(uuid) to authenticated;
grant execute on function public.consume_discount_voucher_usage(uuid) to project_admin;

drop trigger if exists discount_vouchers_set_updated_at on public.discount_vouchers;

create trigger discount_vouchers_set_updated_at
before update on public.discount_vouchers
for each row execute function public.set_updated_at();

alter table public.transactions
  add column if not exists list_amount_rp bigint not null default 0,
  add column if not exists package_discount_amount_rp bigint not null default 0,
  add column if not exists voucher_id uuid references public.discount_vouchers(id) on delete set null,
  add column if not exists voucher_code text,
  add column if not exists voucher_discount_percent integer,
  add column if not exists voucher_discount_amount_rp bigint not null default 0;

update public.transactions
set list_amount_rp = amount_rp,
    package_discount_amount_rp = 0,
    voucher_discount_amount_rp = 0
where list_amount_rp = 0
  and package_discount_amount_rp = 0
  and voucher_discount_amount_rp = 0;

alter table public.transactions
  add constraint transactions_list_amount_non_negative check (list_amount_rp >= 0);

alter table public.transactions
  add constraint transactions_package_discount_amount_non_negative check (package_discount_amount_rp >= 0);

alter table public.transactions
  add constraint transactions_voucher_discount_amount_non_negative check (voucher_discount_amount_rp >= 0);

alter table public.transactions
  add constraint transactions_voucher_discount_percent_range check (
    voucher_discount_percent is null or (voucher_discount_percent > 0 and voucher_discount_percent <= 100)
  );

create index if not exists transactions_voucher_id_idx
  on public.transactions (voucher_id);

commit;
