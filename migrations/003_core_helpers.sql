-- Create helper functions that are shared by many tables and triggers.
-- These helpers are intentionally small so junior developers can find them quickly.

begin;

-- Validate a single exact access key such as tradingview:private.
create or replace function public.is_valid_access_key(p_access_key text)
returns boolean
language sql
immutable
as $$
  select p_access_key in (
    'tradingview:private',
    'tradingview:share',
    'fxreplay:private',
    'fxreplay:share',
    'fxtester:private',
    'fxtester:share'
  )
$$;

-- Validate the JSON array stored by packages, subscriptions, and cd_keys.
create or replace function public.is_valid_access_keys_json(p_data jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_item jsonb;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'array' then
    return false;
  end if;

  if jsonb_array_length(p_data) = 0 then
    return false;
  end if;

  if (
    select count(*)
    from jsonb_array_elements_text(p_data)
  ) <> (
    select count(distinct value)
    from jsonb_array_elements_text(p_data) as t(value)
  ) then
    return false;
  end if;

  for v_item in
    select value from jsonb_array_elements(p_data)
  loop
    if jsonb_typeof(v_item) <> 'string' then
      return false;
    end if;

    if not public.is_valid_access_key(v_item #>> '{}') then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- Keep updated_at fresh without repeating the same UPDATE logic everywhere.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Members may edit profile basics, but not admin-controlled fields.
create or replace function public.validate_profile_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    if new.email is distinct from old.email then
      raise exception 'email cannot be updated directly from profiles';
    end if;

    if new.public_id is distinct from old.public_id then
      raise exception 'public_id cannot be changed by the user';
    end if;

    if new.role is distinct from old.role then
      raise exception 'role cannot be changed by the user';
    end if;

    if new.is_banned is distinct from old.is_banned then
      raise exception 'is_banned cannot be changed by the user';
    end if;

    if new.ban_reason is distinct from old.ban_reason then
      raise exception 'ban_reason cannot be changed by the user';
    end if;
  end if;

  return new;
end;
$$;

commit;
