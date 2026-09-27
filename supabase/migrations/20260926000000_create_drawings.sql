create table public.drawings (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'untitled',
  style text not null,
  width integer not null,
  height integer not null,
  strokes jsonb not null,
  preview text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.drawings enable row level security;

create policy "studio read drawings"
  on public.drawings
  for select
  to anon, authenticated
  using (true);

create policy "studio insert drawings"
  on public.drawings
  for insert
  to anon, authenticated
  with check (true);

create policy "studio update drawings"
  on public.drawings
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "studio delete drawings"
  on public.drawings
  for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on table public.drawings to anon, authenticated;

create index drawings_updated_at_idx on public.drawings (updated_at desc);
