-- RideRutgers: distance-only cost estimate; no live driver presence
-- Run this in the Supabase SQL editor (or via `supabase db push`) after 0002.
--
-- Two design changes, bundled here (see the README's "Design intent" section):
--   1. The cost shown on a trip is a distance-only gas-cost split, never a
--      time-based fare — rename the column so the schema doesn't read as a fare.
--   2. Drivers can't broadcast generic live "available now" presence — trips
--      are posted in advance. `drop table` also removes it from the realtime
--      publication and drops its policies, so this is safe whether or not
--      0002 was ever applied.

alter table public.rides rename column price_per_seat to cost_per_person;

drop table if exists public.driver_presence cascade;
