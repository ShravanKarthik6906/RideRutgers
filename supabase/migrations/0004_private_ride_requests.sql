-- RideRutgers: ride requests must never act as a public bounty
-- Run this in the Supabase SQL editor (or via `supabase db push`) after 0003.
--
-- NJ's informal-carpool exemption requires drivers to post trips they were
-- already planning to take — a rider's request must never be presented to
-- drivers as "here's a request, will you drive this?" or a driver could end
-- up inventing a trip just to fulfill it, which is exactly the on-demand
-- matching behavior the exemption prohibits.
--
-- A request only helps its own rider find an EXISTING posted trip (matched
-- client-side against public.rides, which stays publicly browsable) or wait
-- privately for one to appear. So a request must only ever be visible to the
-- rider who posted it — never a general/public feed.

drop policy "Ride requests are viewable by authenticated users" on public.ride_requests;

create policy "Riders can view their own ride requests"
  on public.ride_requests for select
  to authenticated
  using (auth.uid() = rider_id);
