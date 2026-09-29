-- RideRutgers: stay within New Jersey's informal-carpool exemption
-- Run this in the Supabase SQL editor (or via `supabase db push`) after 0002.
--
-- Two legally-driven changes, bundled here:
--   1. Pricing must be a distance-only gas-cost split, never a time-based
--      fare — rename the column so the schema itself doesn't read as a fare.
--   2. Drivers may not broadcast generic live "available now" presence for
--      ad-hoc matching — only pre-planned, scheduled trips are allowed.
--      `drop table` automatically removes it from the realtime publication
--      and drops its policies, so this is safe whether or not 0002 was ever
--      applied.

alter table public.rides rename column price_per_seat to cost_per_person;

drop table if exists public.driver_presence cascade;
