-- Attach trigger functions to their tables.
-- Keeping trigger wiring separate makes it easy to see what runs automatically.

begin;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profiles_validate_update
before update on public.profiles
for each row execute function public.validate_profile_update();

create trigger packages_set_updated_at
before update on public.packages
for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger subscriptions_normalize_running_before_write
before insert or update of user_id, status, end_at
on public.subscriptions
for each row execute function public.normalize_running_subscriptions_before_write();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger cd_keys_set_updated_at
before update on public.cd_keys
for each row execute function public.set_updated_at();

create trigger asset_assignments_validate_before_write
before insert or update of subscription_id, user_id, asset_id, access_key
on public.asset_assignments
for each row execute function public.validate_asset_assignment();

commit;
