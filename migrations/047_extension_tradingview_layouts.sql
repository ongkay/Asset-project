begin;

create table if not exists public.extension_tradingview_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id),
  chart_id text not null,
  title text,
  url text,
  layout_updated_at timestamptz not null,
  last_opened_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extension_tradingview_layouts_user_chart_unique unique (user_id, chart_id),
  constraint extension_tradingview_layouts_active_row_requires_layout_data
    check (deleted_at is not null or (title is not null and url is not null))
);

create index if not exists extension_tradingview_layouts_user_id_idx
  on public.extension_tradingview_layouts (user_id);

drop trigger if exists extension_tradingview_layouts_set_updated_at on public.extension_tradingview_layouts;

create trigger extension_tradingview_layouts_set_updated_at
before update on public.extension_tradingview_layouts
for each row execute function public.set_updated_at();

create or replace function public.upsert_extension_tradingview_layout(
  p_user_id uuid,
  p_chart_id text,
  p_title text,
  p_url text,
  p_layout_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_chart_id is null or btrim(p_chart_id) = '' then
    raise exception 'chart_id is required';
  end if;

  if p_layout_updated_at is null then
    raise exception 'layout_updated_at is required';
  end if;

  insert into public.extension_tradingview_layouts (
    user_id,
    chart_id,
    title,
    url,
    layout_updated_at,
    last_opened_at,
    deleted_at
  )
  values (
    p_user_id,
    p_chart_id,
    p_title,
    p_url,
    p_layout_updated_at,
    null,
    p_deleted_at
  )
  on conflict (user_id, chart_id) do update
  set title = excluded.title,
      url = excluded.url,
      layout_updated_at = excluded.layout_updated_at,
      last_opened_at = case when excluded.deleted_at is not null then null else extension_tradingview_layouts.last_opened_at end,
      deleted_at = excluded.deleted_at
  where (
    excluded.deleted_at is not null and (
      (extension_tradingview_layouts.deleted_at is null and extension_tradingview_layouts.layout_updated_at <= excluded.deleted_at)
      or
      (extension_tradingview_layouts.deleted_at is not null and extension_tradingview_layouts.deleted_at < excluded.deleted_at)
    )
  )
  or (
    excluded.deleted_at is null and (
      (extension_tradingview_layouts.deleted_at is null and extension_tradingview_layouts.layout_updated_at < excluded.layout_updated_at)
      or
      (extension_tradingview_layouts.deleted_at is not null and extension_tradingview_layouts.deleted_at < excluded.layout_updated_at)
    )
  );
end;
$$;

create or replace function public.set_extension_tradingview_last_opened(
  p_user_id uuid,
  p_chart_id text,
  p_last_opened_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_updated_count integer;
begin
  if p_user_id is null or p_chart_id is null or btrim(p_chart_id) = '' or p_last_opened_at is null then
    return;
  end if;

  update public.extension_tradingview_layouts
  set last_opened_at = p_last_opened_at
  where user_id = p_user_id
    and chart_id = p_chart_id
    and deleted_at is null
    and (last_opened_at is null or last_opened_at < p_last_opened_at);

  get diagnostics v_target_updated_count = row_count;

  if v_target_updated_count = 0 then
    return;
  end if;

  update public.extension_tradingview_layouts
  set last_opened_at = null
  where user_id = p_user_id
    and chart_id <> p_chart_id
    and last_opened_at is not null
    and last_opened_at <= p_last_opened_at;
end;
$$;

commit;
