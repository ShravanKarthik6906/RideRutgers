-- RideRutgers: live driver presence + driver document uploads
-- Run this in the Supabase SQL editor (or via `supabase db push`) after 0001_init.sql.

-- ---------- driver_presence (foreground-only "online" broadcast) ----------

create table public.driver_presence (
  driver_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.driver_presence enable row level security;

create policy "Presence is viewable by authenticated users"
  on public.driver_presence for select
  to authenticated
  using (true);

create policy "Verified drivers can upsert their own presence"
  on public.driver_presence for insert
  to authenticated
  with check (
    auth.uid() = driver_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_driver_verified = true
    )
  );

create policy "Drivers can update their own presence"
  on public.driver_presence for update
  to authenticated
  using (auth.uid() = driver_id);

create policy "Drivers can go offline (delete their own presence)"
  on public.driver_presence for delete
  to authenticated
  using (auth.uid() = driver_id);

alter publication supabase_realtime add table public.driver_presence;

grant select, insert, update, delete on public.driver_presence to authenticated;

-- ---------- driver_applications: license/insurance photo paths ----------

alter table public.driver_applications
  add column license_photo_path text,
  add column insurance_photo_path text;

-- ---------- storage: private bucket for driver documents ----------

insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', false)
on conflict (id) do nothing;

-- Applicants can upload/read their own documents; objects are keyed by
-- "<user_id>/license.jpg" etc, so the first path segment is the owner check.
create policy "Users can upload their own driver documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their own driver documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
