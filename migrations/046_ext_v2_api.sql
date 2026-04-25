begin;

create table if not exists public.extension_app_configs (
  id uuid primary key default gen_random_uuid(),
  extension_key text not null unique,
  latest_version text not null,
  minimum_version text not null,
  download_url text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists extension_app_configs_set_updated_at on public.extension_app_configs;

create trigger extension_app_configs_set_updated_at
before update on public.extension_app_configs
for each row execute function public.set_updated_at();

insert into public.extension_app_configs (
  extension_key,
  latest_version,
  minimum_version,
  download_url,
  is_active
)
values (
  'asset-extension-v2',
  '0.0.1',
  '0.0.1',
  'https://github.com/',
  true
)
on conflict (extension_key) do nothing;

alter table public.extension_tracks
  add column if not exists origin text;

update public.extension_tracks
set
  origin = coalesce(origin, 'unknown'),
  browser = coalesce(browser, 'Unknown'),
  os = coalesce(os, 'Unknown')
where origin is null or browser is null or os is null;

alter table public.extension_tracks
  alter column origin set not null;

alter table public.extension_tracks
  alter column browser set not null;

alter table public.extension_tracks
  alter column os set not null;

alter table public.extension_tracks
  drop constraint if exists extension_tracks_identity_unique;

drop index if exists public.extension_tracks_user_id_device_id_ip_address_extension_id_key;

create unique index if not exists extension_tracks_fingerprint_unique
  on public.extension_tracks (user_id, device_id, extension_id, origin, ip_address, browser, os);

create or replace function public.upsert_extension_track(
  p_extension_id text,
  p_device_id text,
  p_extension_version text,
  p_ip_address text,
  p_city text default null,
  p_country text default null,
  p_browser text default null,
  p_os text default null,
  p_session_id uuid default null,
  p_user_id uuid default null
)
returns public.extension_tracks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
  v_user_id uuid;
  v_row public.extension_tracks;
  v_origin text;
  v_browser text;
  v_os text;
begin
  v_actor_user_id := auth.uid();
  v_user_id := coalesce(p_user_id, v_actor_user_id);
  v_origin := 'unknown';
  v_browser := coalesce(nullif(btrim(p_browser), ''), 'Unknown');
  v_os := coalesce(nullif(btrim(p_os), ''), 'Unknown');

  if v_user_id is null then
    raise exception 'user_id is required';
  end if;

  if v_actor_user_id is not null
     and v_user_id <> v_actor_user_id
     and not public.is_app_admin() then
    raise exception 'cannot upsert extension track for another user';
  end if;

  if p_extension_id is null or btrim(p_extension_id) = '' then
    raise exception 'extension_id is required';
  end if;

  if p_device_id is null or btrim(p_device_id) = '' then
    raise exception 'device_id is required';
  end if;

  if p_extension_version is null or btrim(p_extension_version) = '' then
    raise exception 'extension_version is required';
  end if;

  if p_ip_address is null or btrim(p_ip_address) = '' then
    raise exception 'ip_address is required';
  end if;

  insert into public.extension_tracks (
    user_id,
    session_id,
    extension_id,
    device_id,
    extension_version,
    origin,
    ip_address,
    city,
    country,
    browser,
    os,
    first_seen_at,
    last_seen_at
  )
  values (
    v_user_id,
    p_session_id,
    p_extension_id,
    p_device_id,
    p_extension_version,
    v_origin,
    p_ip_address,
    p_city,
    p_country,
    v_browser,
    v_os,
    now(),
    now()
  )
  on conflict (user_id, device_id, extension_id, origin, ip_address, browser, os) do update
  set session_id = excluded.session_id,
      extension_version = excluded.extension_version,
      city = excluded.city,
      country = excluded.country,
      last_seen_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

commit;
