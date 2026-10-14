import { describe, expect, it } from 'vitest';
import { MATCH_RADIUS_MILES, MATCH_TIME_WINDOW_HOURS } from '../constants/matching';
import { filterMatchingRides, isRequestExpired, rideMatchesQuery, type TripQuery } from '../lib/matching';
import type { Ride } from '../lib/types';

const NEW_BRUNSWICK = { lat: 40.5008, lng: -74.4474 };
const NEWARK = { lat: 40.7357, lng: -74.1724 };
const DEPARTURE = '2026-10-12T14:00:00.000Z';
// A fixed "now" a day before the fixture trip, so tests don't depend on the real clock.
const NOW = new Date('2026-10-11T14:00:00.000Z').getTime();

// ~0.0145 degrees of latitude is about one mile.
const MILE_IN_DEGREES = 1 / 69.09;

function ride(overrides: Partial<Ride> = {}): Ride {
  return {
    id: 'ride-1',
    driver_id: 'driver-1',
    origin_label: 'New Brunswick',
    origin_lat: NEW_BRUNSWICK.lat,
    origin_lng: NEW_BRUNSWICK.lng,
    destination_label: 'Newark',
    destination_lat: NEWARK.lat,
    destination_lng: NEWARK.lng,
    distance_miles: 22,
    departure_time: DEPARTURE,
    seats_total: 3,
    seats_available: 2,
    cost_per_person: 4,
    status: 'scheduled',
    live_lat: null,
    live_lng: null,
    live_updated_at: null,
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

const query: TripQuery = {
  originLat: NEW_BRUNSWICK.lat,
  originLng: NEW_BRUNSWICK.lng,
  destinationLat: NEWARK.lat,
  destinationLng: NEWARK.lng,
  requestedTime: DEPARTURE,
};

describe('rideMatchesQuery', () => {
  it('matches the same route at the same time', () => {
    expect(rideMatchesQuery(ride(), query, NOW)).toBe(true);
  });

  it('matches a nearby pickup inside the radius', () => {
    const nearby = ride({ origin_lat: NEW_BRUNSWICK.lat + (MATCH_RADIUS_MILES - 1) * MILE_IN_DEGREES });
    expect(rideMatchesQuery(nearby, query, NOW)).toBe(true);
  });

  it('rejects a pickup outside the radius', () => {
    const far = ride({ origin_lat: NEW_BRUNSWICK.lat + (MATCH_RADIUS_MILES + 1) * MILE_IN_DEGREES });
    expect(rideMatchesQuery(far, query, NOW)).toBe(false);
  });

  it('rejects a drop-off outside the radius', () => {
    const far = ride({ destination_lat: NEWARK.lat + (MATCH_RADIUS_MILES + 1) * MILE_IN_DEGREES });
    expect(rideMatchesQuery(far, query, NOW)).toBe(false);
  });

  it('matches a departure just inside the time window, before or after', () => {
    const justInside = MATCH_TIME_WINDOW_HOURS * 60 - 1;
    const later = new Date(new Date(DEPARTURE).getTime() + justInside * 60_000).toISOString();
    const earlier = new Date(new Date(DEPARTURE).getTime() - justInside * 60_000).toISOString();
    expect(rideMatchesQuery(ride({ departure_time: later }), query, NOW)).toBe(true);
    expect(rideMatchesQuery(ride({ departure_time: earlier }), query, NOW)).toBe(true);
  });

  it('rejects a departure just outside the time window', () => {
    const justOutside = MATCH_TIME_WINDOW_HOURS * 60 + 1;
    const later = new Date(new Date(DEPARTURE).getTime() + justOutside * 60_000).toISOString();
    expect(rideMatchesQuery(ride({ departure_time: later }), query, NOW)).toBe(false);
  });

  it('rejects rides that are not open for booking', () => {
    expect(rideMatchesQuery(ride({ status: 'in_progress' }), query, NOW)).toBe(false);
    expect(rideMatchesQuery(ride({ status: 'completed' }), query, NOW)).toBe(false);
    expect(rideMatchesQuery(ride({ status: 'cancelled' }), query, NOW)).toBe(false);
  });

  it('rejects full rides', () => {
    expect(rideMatchesQuery(ride({ seats_available: 0 }), query, NOW)).toBe(false);
  });
});

describe('expired requests', () => {
  it('treats a requested time in the past as expired, and one in the future as live', () => {
    expect(isRequestExpired('2026-10-11T13:59:59.000Z', NOW)).toBe(true);
    expect(isRequestExpired('2026-10-11T14:00:01.000Z', NOW)).toBe(false);
  });

  it('never matches anything once the requested time has passed, even for a perfect route', () => {
    const afterDeparture = new Date('2026-10-12T14:30:00.000Z').getTime();
    expect(rideMatchesQuery(ride(), query, afterDeparture)).toBe(false);
    expect(filterMatchingRides([ride()], query, afterDeparture)).toEqual([]);
  });

  it('still matches right up until the requested time', () => {
    const justBefore = new Date('2026-10-12T13:59:59.000Z').getTime();
    expect(rideMatchesQuery(ride(), query, justBefore)).toBe(true);
  });
});

describe('filterMatchingRides', () => {
  it('keeps only matching rides and preserves order', () => {
    const rides = [
      ride({ id: 'a' }),
      ride({ id: 'b', seats_available: 0 }),
      ride({ id: 'c' }),
      ride({ id: 'd', status: 'cancelled' }),
    ];
    expect(filterMatchingRides(rides, query, NOW).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('returns nothing when no posted trip matches (a request never creates one)', () => {
    expect(filterMatchingRides([], query, NOW)).toEqual([]);
  });
});
