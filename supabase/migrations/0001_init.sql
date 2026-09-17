-- RideRutgers initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  is_driver_verified boolean not null default false,
  driver_verification_status text not null default 'none'
    check (driver_verification_status in ('none', 'pending', 'approved', 'rejected')),
  rating_avg numeric not null default 5.0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- driver_applications ----------

create table public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  license_number text not null,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_plate text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.driver_applications enable row level security;

create policy "Users can view their own applications"
  on public.driver_applications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can submit their own application"
  on public.driver_applications for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Reviewing applications (approve/reject) is done from the Supabase dashboard
-- or a service-role admin tool, not from the client app.

-- ---------- rides (the Ride Board: driver-posted offers) ----------

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  origin_label text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_label text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  distance_miles numeric not null,
  departure_time timestamptz not null,
  seats_total integer not null check (seats_total > 0),
  seats_available integer not null check (seats_available >= 0),
  price_per_seat numeric not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  live_lat double precision,
  live_lng double precision,
  live_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rides enable row level security;

create policy "Rides are viewable by authenticated users"
  on public.rides for select
  to authenticated
  using (true);

create policy "Verified drivers can post rides"
  on public.rides for insert
  to authenticated
  with check (
    auth.uid() = driver_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_driver_verified = true
    )
  );

create policy "Drivers can update their own rides"
  on public.rides for update
  to authenticated
  using (auth.uid() = driver_id);

-- ---------- ride_requests (riders looking for a ride) ----------

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles (id) on delete cascade,
  origin_label text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_label text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  requested_time timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'matched', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.ride_requests enable row level security;

create policy "Ride requests are viewable by authenticated users"
  on public.ride_requests for select
  to authenticated
  using (true);

create policy "Riders can post their own ride request"
  on public.ride_requests for insert
  to authenticated
  with check (auth.uid() = rider_id);

create policy "Riders can update their own ride request"
  on public.ride_requests for update
  to authenticated
  using (auth.uid() = rider_id);

-- ---------- bookings ----------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  rider_id uuid not null references public.profiles (id) on delete cascade,
  seats_booked integer not null default 1 check (seats_booked > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  unique (ride_id, rider_id)
);

alter table public.bookings enable row level security;

create policy "Riders and the ride's driver can view a booking"
  on public.bookings for select
  to authenticated
  using (
    auth.uid() = rider_id
    or auth.uid() = (select driver_id from public.rides where id = ride_id)
  );

create policy "Riders can request to join a ride"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = rider_id);

create policy "Riders can cancel their own booking, drivers can respond"
  on public.bookings for update
  to authenticated
  using (
    auth.uid() = rider_id
    or auth.uid() = (select driver_id from public.rides where id = ride_id)
  );

-- ---------- ride_messages (simple per-ride chat) ----------

create table public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.ride_messages enable row level security;

create policy "Ride participants can read messages"
  on public.ride_messages for select
  to authenticated
  using (
    auth.uid() = (select driver_id from public.rides where id = ride_id)
    or exists (
      select 1 from public.bookings
      where ride_id = ride_messages.ride_id
        and rider_id = auth.uid()
        and status in ('pending', 'confirmed', 'completed')
    )
  );

create policy "Ride participants can send messages"
  on public.ride_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and (
      auth.uid() = (select driver_id from public.rides where id = ride_id)
      or exists (
        select 1 from public.bookings
        where ride_id = ride_messages.ride_id
          and rider_id = auth.uid()
          and status in ('pending', 'confirmed', 'completed')
      )
    )
  );

-- ---------- ratings ----------

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (ride_id, rater_id, ratee_id)
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by authenticated users"
  on public.ratings for select
  to authenticated
  using (true);

create policy "Users can rate others on rides they participated in"
  on public.ratings for insert
  to authenticated
  with check (
    auth.uid() = rater_id
    and (
      auth.uid() = (select driver_id from public.rides where id = ride_id)
      or exists (
        select 1 from public.bookings
        where ride_id = ratings.ride_id and rider_id = auth.uid() and status = 'completed'
      )
    )
  );

-- Keep a profile's rating_avg / rating_count in sync whenever a rating is added.
create function public.handle_new_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set
    rating_count = rating_count + 1,
    rating_avg = ((rating_avg * rating_count) + new.stars) / (rating_count + 1)
  where id = new.ratee_id;
  return new;
end;
$$;

create trigger on_rating_created
  after insert on public.ratings
  for each row execute procedure public.handle_new_rating();

-- ---------- realtime ----------

alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.ride_messages;
alter publication supabase_realtime add table public.ride_requests;

-- ---------- grants ----------
-- Required if automatic table exposure to anon/authenticated is turned off
-- for this project. RLS policies above then narrow what each role can
-- actually see/touch. No delete grants: no table has a delete policy.

grant usage on schema public to authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.driver_applications to authenticated;
grant select, insert, update on public.rides to authenticated;
grant select, insert, update on public.ride_requests to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert on public.ride_messages to authenticated;
grant select, insert on public.ratings to authenticated;
