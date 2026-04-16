-- Allow trusted server key context to execute safe-delete RPC.

begin;

create or replace function public.delete_asset_safely(p_asset_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair record;
  v_claim_role text;
begin
  v_claim_role := nullif(current_setting('request.jwt.claim.role', true), '');

  if v_claim_role <> 'project_admin' then
    if auth.uid() is not null and not public.is_app_admin() then
      raise exception 'admin access required';
    end if;
  end if;

  for v_pair in
    with revoked as (
      update public.asset_assignments
      set revoked_at = coalesce(revoked_at, now()),
          revoke_reason = coalesce(revoke_reason, 'asset_deleted')
      where asset_id = p_asset_id
        and revoked_at is null
      returning subscription_id, access_key
    )
    select distinct subscription_id, access_key
    from revoked
  loop
    perform public.assign_best_asset(v_pair.subscription_id, v_pair.access_key, p_asset_id);
  end loop;

  update public.asset_assignments
  set asset_deleted_at = coalesce(asset_deleted_at, now())
  where original_asset_id = p_asset_id;

  perform public.apply_subscription_status(ds.subscription_id)
  from (
    select distinct aa.subscription_id
    from public.asset_assignments aa
    where aa.original_asset_id = p_asset_id
  ) as ds;

  delete from public.assets where id = p_asset_id;
end;
$$;

grant execute on function public.delete_asset_safely(uuid) to project_admin;

commit;
