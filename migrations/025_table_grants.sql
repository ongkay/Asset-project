-- Grant table privileges required for RLS policies to work.
-- Policies do not help unless the target role also has table privileges.

begin;

grant usage on schema public to authenticated;
grant usage on schema public to project_admin;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to project_admin;
grant all privileges on all sequences in schema public to project_admin;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;

alter default privileges in schema public
  grant all privileges on tables to project_admin;

alter default privileges in schema public
  grant all privileges on sequences to project_admin;

commit;
