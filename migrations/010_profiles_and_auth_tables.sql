-- Create profile, session, and login log tables.
-- These tables hold identity and sign-in history for the app.

begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  public_id text not null,
  avatar_url text,
  role public.role_enum not null,
  is_banned boolean not null default false,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email),
  constraint profiles_username_unique unique (username),
  constraint profiles_public_id_unique unique (public_id)
);

create index profiles_role_banned_idx on public.profiles (role, is_banned);

create table public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  token_hash text not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint app_sessions_token_hash_unique unique (token_hash),
  constraint app_sessions_revoked_after_created check (revoked_at is null or revoked_at >= created_at)
);

create unique index app_sessions_one_active_per_user_idx
  on public.app_sessions (user_id)
  where revoked_at is null;

create index app_sessions_user_last_seen_idx
  on public.app_sessions (user_id, last_seen_at desc);

create table public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  email text not null,
  is_success boolean not null,
  failure_reason text,
  ip_address text not null,
  browser text,
  os text,
  created_at timestamptz not null default now()
);

create index login_logs_email_created_at_idx
  on public.login_logs (email, created_at desc);

create index login_logs_user_created_at_idx
  on public.login_logs (user_id, created_at desc);

create index login_logs_success_created_at_idx
  on public.login_logs (is_success, created_at desc);

commit;
