const RATE_PER_MILE = 1.5;
const RATE_PER_MINUTE = 1.2;
const MINIMUM_FARE = 3;

// No routing/directions API is wired up, so trip duration is estimated from
// distance at a flat assumed speed. It's only used to compute the per-minute
// portion of the estimate shown to riders/drivers, not for navigation.
const ASSUMED_AVERAGE_SPEED_MPH = 25;

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceInMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

export function estimatedMinutes(distanceMiles: number): number {
  return (distanceMiles / ASSUMED_AVERAGE_SPEED_MPH) * 60;
}

export interface PriceBreakdown {
  distanceMiles: number;
  minutes: number;
  mileageCost: number;
  timeCost: number;
  total: number;
}

export function priceBreakdown(distanceMiles: number): PriceBreakdown {
  const minutes = estimatedMinutes(distanceMiles);
  const mileageCost = distanceMiles * RATE_PER_MILE;
  const timeCost = minutes * RATE_PER_MINUTE;
  const total = Math.max(MINIMUM_FARE, Math.round((mileageCost + timeCost) * 100) / 100);
  return { distanceMiles, minutes, mileageCost, timeCost, total };
}

export function flatRatePrice(distanceMiles: number): number {
  return priceBreakdown(distanceMiles).total;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatMiles(distanceMiles: number): string {
  return `${distanceMiles.toFixed(1)} mi`;
}

export function formatMinutes(minutes: number): string {
  return `${Math.round(minutes)} min`;
}
