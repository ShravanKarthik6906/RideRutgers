import { MATCH_RADIUS_MILES, MATCH_TIME_WINDOW_HOURS } from '../constants/matching';
import { distanceInMiles } from './pricing';
import type { Ride } from './types';

export interface TripQuery {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  requestedTime: string;
}

// A request is expired once the time the rider asked for has passed. Expired
// requests are hidden from My Rides and never match anything.
export function isRequestExpired(requestedTime: string, now: number = Date.now()): boolean {
  return new Date(requestedTime).getTime() < now;
}

// A rider's desired trip matches an already-posted ride when the requested
// time hasn't passed, the ride is still open for booking, both ends are within
// MATCH_RADIUS_MILES, and the departure is within MATCH_TIME_WINDOW_HOURS of
// the requested time (either direction).
export function rideMatchesQuery(ride: Ride, query: TripQuery, now: number = Date.now()): boolean {
  if (isRequestExpired(query.requestedTime, now)) return false;
  if (ride.status !== 'scheduled' || ride.seats_available <= 0) return false;

  const originDistance = distanceInMiles(query.originLat, query.originLng, ride.origin_lat, ride.origin_lng);
  const destinationDistance = distanceInMiles(
    query.destinationLat,
    query.destinationLng,
    ride.destination_lat,
    ride.destination_lng
  );
  if (originDistance > MATCH_RADIUS_MILES || destinationDistance > MATCH_RADIUS_MILES) return false;

  const windowMs = MATCH_TIME_WINDOW_HOURS * 60 * 60 * 1000;
  const offsetMs = Math.abs(new Date(ride.departure_time).getTime() - new Date(query.requestedTime).getTime());
  return offsetMs <= windowMs;
}

export function filterMatchingRides(rides: Ride[], query: TripQuery, now: number = Date.now()): Ride[] {
  return rides.filter((ride) => rideMatchesQuery(ride, query, now));
}
