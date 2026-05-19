begin;

alter table public.assets
  add column if not exists launch_url text;

commit;
