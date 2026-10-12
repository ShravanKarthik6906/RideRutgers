-- RideRutgers: close client-side privilege-escalation holes in the RLS policies
-- Run this in the Supabase SQL editor (or via `supabase db push`) after 0004.
--
-- Found in a pre-publication audit. Before this migration any signed-in user,
-- using only the public anon key and their own session, could:
--   * set is_driver_verified / driver_verification_status / rating_* on their
--     own profile (bypassing manual driver review and the "verified drivers
--     only can post rides" policy), and
--   * insert their own booking as 'confirmed', or flip their own pending
--     booking to 'confirmed'.
-- Driver approval is meant to be an admin-only action done from the Supabase
-- dashboard (which runs as the postgres/service role, not `authenticated`).
-- tests/rls.test.ts exercises all of this from an `authenticated` session.

-- ---------- profiles: clients may only edit name and phone ----------

-- Profile rows are created by the on_auth_user_created trigger; the client
-- never inserts one, and may only change its own name/phone afterwards.
-- (Revoking table-level UPDATE also drops any column grants, so the column
-- grant below is the only client update path.)
drop policy "Users can insert their own profile" on public.profiles;
revoke insert, update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ---------- driver_applications: the pending flag moves server-side ----------

drop policy "Users can submit their own application" on public.driver_applications;

create policy "Users can submit their own application"
  on public.driver_applications for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending' and reviewed_at is null);

-- Previously the client updated profiles.driver_verification_status itself,
-- which the column grant above no longer allows (and shouldn't).
create function public.handle_new_driver_application()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set driver_verification_status = 'pending'
  where id = new.user_id
    and is_driver_verified = false
    and driver_verification_status in ('none', 'rejected');
  return new;
end;
$$;

create trigger on_driver_application_created
  after insert on public.driver_applications
  for each row execute procedure public.handle_new_driver_application();

-- ---------- bookings: riders can only cancel, drivers can only respond ----------

drop policy "Riders can request to join a ride" on public.bookings;

create policy "Riders can request to join a ride"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = rider_id and status = 'pending');

create function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ride_driver uuid;
begin
  -- Not an API client (e.g. the dashboard or service role): no restriction.
  if auth.uid() is null then
    return new;
  end if;

  if new.ride_id is distinct from old.ride_id
     or new.rider_id is distinct from old.rider_id
     or new.seats_booked is distinct from old.seats_booked then
    raise exception 'A booking''s ride, rider and seat count cannot be changed.';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  select driver_id into ride_driver from public.rides where id = new.ride_id;

  if auth.uid() = ride_driver then
    if new.status not in ('confirmed', 'declined', 'completed') then
      raise exception 'A driver may only confirm, decline or complete a booking.';
    end if;
  elsif auth.uid() = new.rider_id then
    if new.status <> 'cancelled' then
      raise exception 'A rider may only cancel their own booking.';
    end if;
  else
    raise exception 'Not allowed to change this booking.';
  end if;

  return new;
end;
$$;

create trigger guard_booking_update
  before update on public.bookings
  for each row execute procedure public.guard_booking_update();

-- ---------- storage: allow replacing your own driver documents ----------

-- The app uploads with upsert: true, which needs UPDATE as well as INSERT.
create policy "Users can replace their own driver documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
