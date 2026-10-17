-- Keep drawings private to the Digi server (service role bypasses RLS).
-- Anonymous clients should not read or write the table directly.

drop policy if exists "studio read drawings" on public.drawings;
drop policy if exists "studio insert drawings" on public.drawings;
drop policy if exists "studio update drawings" on public.drawings;
drop policy if exists "studio delete drawings" on public.drawings;

revoke all on table public.drawings from anon, authenticated;

create or replace function public.set_drawings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists drawings_set_updated_at on public.drawings;

create trigger drawings_set_updated_at
  before update on public.drawings
  for each row
  execute function public.set_drawings_updated_at();
