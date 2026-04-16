-- Ensure trusted server role can execute safe-delete RPC for admin actions.

begin;

grant execute on function public.delete_asset_safely(uuid) to project_admin;

commit;
