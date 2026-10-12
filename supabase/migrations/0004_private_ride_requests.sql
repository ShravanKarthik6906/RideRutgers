-- RideRutgers: ride requests are private to the rider who posted them
-- Run this in the Supabase SQL editor (or via `supabase db push`) after 0003.
--
-- Design intent: trips exist because a driver was already making them, never
-- because a rider asked. A request therefore must not be browsable by drivers
-- as "here's a request, will you drive this?" — that would let a request
-- become the reason a trip gets created.
--
-- A request only helps its own rider find an EXISTING posted trip (matched
-- client-side against public.rides, which stays publicly browsable) or wait
-- privately for one to appear. So it is visible only to the rider who posted
-- it — never a general/public feed.

drop policy "Ride requests are viewable by authenticated users" on public.ride_requests;

create policy "Riders can view their own ride requests"
  on public.ride_requests for select
  to authenticated
  using (auth.uid() = rider_id);
