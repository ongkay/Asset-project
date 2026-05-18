begin;

delete from public.extension_tradingview_layouts
where deleted_at is not null
   or title is null
   or url is null;

alter table public.extension_tradingview_layouts
  drop constraint if exists extension_tradingview_layouts_active_row_requires_layout_data;

alter table public.extension_tradingview_layouts
  alter column title set not null,
  alter column url set not null,
  drop column if exists deleted_at;

drop function if exists public.upsert_extension_tradingview_layout(uuid, text, text, text, timestamptz, timestamptz);

create or replace function public.upsert_extension_tradingview_layout(
  p_user_id uuid,
  p_chart_id text,
  p_title text,
  p_url text,
  p_layout_updated_at timestamptz
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

  if p_title is null or btrim(p_title) = '' then
    raise exception 'title is required';
  end if;

  if p_url is null or btrim(p_url) = '' then
    raise exception 'url is required';
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
    last_opened_at
  )
  values (
    p_user_id,
    p_chart_id,
    p_title,
    p_url,
    p_layout_updated_at,
    null
  )
  on conflict (user_id, chart_id) do update
  set title = excluded.title,
      url = excluded.url,
      layout_updated_at = excluded.layout_updated_at
  where extension_tradingview_layouts.layout_updated_at < excluded.layout_updated_at;
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
