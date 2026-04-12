-- Enable row level security and define who can read or change each table.
-- Members see their own rows, while app admins use is_app_admin().

begin;

alter table public.profiles enable row level security;
alter table public.app_sessions enable row level security;
alter table public.login_logs enable row level security;
alter table public.packages enable row level security;
alter table public.assets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.transactions enable row level security;
alter table public.cd_keys enable row level security;
alter table public.extension_tracks enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin())
  with check (auth.uid() = user_id or public.is_app_admin());

create policy profiles_admin_select
  on public.profiles
  for select
  to authenticated
  using (public.is_app_admin());

create policy profiles_admin_insert
  on public.profiles
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy profiles_admin_update
  on public.profiles
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy app_sessions_admin_select
  on public.app_sessions
  for select
  to authenticated
  using (public.is_app_admin());

create policy login_logs_admin_select
  on public.login_logs
  for select
  to authenticated
  using (public.is_app_admin());

create policy packages_select_active
  on public.packages
  for select
  to authenticated
  using (is_active = true);

create policy packages_admin_select
  on public.packages
  for select
  to authenticated
  using (public.is_app_admin());

create policy packages_admin_insert
  on public.packages
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy packages_admin_update
  on public.packages
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy assets_admin_select
  on public.assets
  for select
  to authenticated
  using (public.is_app_admin());

create policy assets_admin_insert
  on public.assets
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy assets_admin_update
  on public.assets
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy subscriptions_select_own
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin());

create policy subscriptions_admin_select
  on public.subscriptions
  for select
  to authenticated
  using (public.is_app_admin());

create policy subscriptions_admin_insert
  on public.subscriptions
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy subscriptions_admin_update
  on public.subscriptions
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy asset_assignments_select_own
  on public.asset_assignments
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin());

create policy asset_assignments_admin_select
  on public.asset_assignments
  for select
  to authenticated
  using (public.is_app_admin());

create policy asset_assignments_admin_insert
  on public.asset_assignments
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy asset_assignments_admin_update
  on public.asset_assignments
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy transactions_select_own
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_app_admin());

create policy transactions_admin_select
  on public.transactions
  for select
  to authenticated
  using (public.is_app_admin());

create policy transactions_admin_insert
  on public.transactions
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy transactions_admin_update
  on public.transactions
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy cd_keys_admin_select
  on public.cd_keys
  for select
  to authenticated
  using (public.is_app_admin());

create policy cd_keys_admin_insert
  on public.cd_keys
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy cd_keys_admin_update
  on public.cd_keys
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy extension_tracks_admin_all
  on public.extension_tracks
  for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

commit;
