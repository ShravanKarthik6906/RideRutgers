import { ASSUMED_MPG, PRICE_PER_GALLON } from '../constants/pricing';

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

export interface GasCostSplit {
  distanceMiles: number;
  occupants: number;
  totalGasCost: number;
  costPerPerson: number;
}

// Distance-only gas cost, split evenly across everyone in the car (driver
// included) — no time component, no surge, no per-rider negotiation. See
// constants/pricing.ts for why and how to tune the MPG/gas-price assumptions.
export function estimateGasCostSplit(distanceMiles: number, occupants: number): GasCostSplit {
  const totalGasCost = (distanceMiles / ASSUMED_MPG) * PRICE_PER_GALLON;
  const costPerPerson = totalGasCost / occupants;
  return { distanceMiles, occupants, totalGasCost, costPerPerson };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatMiles(distanceMiles: number): string {
  return `${distanceMiles.toFixed(1)} mi`;
}
