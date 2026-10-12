import { describe, expect, it } from 'vitest';
import { MATCH_RADIUS_MILES, MATCH_TIME_WINDOW_HOURS } from '../constants/matching';
import { filterMatchingRides, rideMatchesQuery, type TripQuery } from '../lib/matching';
import type { Ride } from '../lib/types';

const NEW_BRUNSWICK = { lat: 40.5008, lng: -74.4474 };
const NEWARK = { lat: 40.7357, lng: -74.1724 };
const DEPARTURE = '2026-10-12T14:00:00.000Z';

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
    expect(rideMatchesQuery(ride(), query)).toBe(true);
  });

  it('matches a nearby pickup inside the radius', () => {
    const nearby = ride({ origin_lat: NEW_BRUNSWICK.lat + (MATCH_RADIUS_MILES - 1) * MILE_IN_DEGREES });
    expect(rideMatchesQuery(nearby, query)).toBe(true);
  });

  it('rejects a pickup outside the radius', () => {
    const far = ride({ origin_lat: NEW_BRUNSWICK.lat + (MATCH_RADIUS_MILES + 1) * MILE_IN_DEGREES });
    expect(rideMatchesQuery(far, query)).toBe(false);
  });

  it('rejects a drop-off outside the radius', () => {
    const far = ride({ destination_lat: NEWARK.lat + (MATCH_RADIUS_MILES + 1) * MILE_IN_DEGREES });
    expect(rideMatchesQuery(far, query)).toBe(false);
  });

  it('matches a departure just inside the time window, before or after', () => {
    const justInside = MATCH_TIME_WINDOW_HOURS * 60 - 1;
    const later = new Date(new Date(DEPARTURE).getTime() + justInside * 60_000).toISOString();
    const earlier = new Date(new Date(DEPARTURE).getTime() - justInside * 60_000).toISOString();
    expect(rideMatchesQuery(ride({ departure_time: later }), query)).toBe(true);
    expect(rideMatchesQuery(ride({ departure_time: earlier }), query)).toBe(true);
  });

  it('rejects a departure just outside the time window', () => {
    const justOutside = MATCH_TIME_WINDOW_HOURS * 60 + 1;
    const later = new Date(new Date(DEPARTURE).getTime() + justOutside * 60_000).toISOString();
    expect(rideMatchesQuery(ride({ departure_time: later }), query)).toBe(false);
  });

  it('rejects rides that are not open for booking', () => {
    expect(rideMatchesQuery(ride({ status: 'in_progress' }), query)).toBe(false);
    expect(rideMatchesQuery(ride({ status: 'completed' }), query)).toBe(false);
    expect(rideMatchesQuery(ride({ status: 'cancelled' }), query)).toBe(false);
  });

  it('rejects full rides', () => {
    expect(rideMatchesQuery(ride({ seats_available: 0 }), query)).toBe(false);
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
    expect(filterMatchingRides(rides, query).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('returns nothing when no posted trip matches (a request never creates one)', () => {
    expect(filterMatchingRides([], query)).toEqual([]);
  });
});
