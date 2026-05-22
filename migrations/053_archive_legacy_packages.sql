-- Archive legacy packages from the new checkout catalog without deleting historical rows.

begin;

update public.packages
set is_active = false,
    updated_at = now()
where checkout_group = 'legacy'
  and is_active = true;

commit;
