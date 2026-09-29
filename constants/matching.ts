// How close a rider's requested origin/destination and time must be to an
// existing posted trip to count as a match. Requests only ever search
// against trips drivers already posted — see lib/api.ts's findMatchingRides
// and supabase/migrations/0004_private_ride_requests.sql for why.
export const MATCH_RADIUS_MILES = 5;
export const MATCH_TIME_WINDOW_HOURS = 3;
