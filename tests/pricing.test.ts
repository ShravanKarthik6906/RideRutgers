import { describe, expect, it } from 'vitest';
import { ASSUMED_MPG, PRICE_PER_GALLON } from '../constants/pricing';
import { distanceInMiles, estimateGasCostSplit, formatCurrency, formatMiles } from '../lib/pricing';

describe('distanceInMiles', () => {
  it('is zero for identical points', () => {
    expect(distanceInMiles(40.5, -74.4, 40.5, -74.4)).toBe(0);
  });

  it('measures one degree of latitude as about 69 miles', () => {
    expect(distanceInMiles(40, -74, 41, -74)).toBeCloseTo(69.09, 1);
  });

  it('is symmetric', () => {
    const there = distanceInMiles(40.5008, -74.4474, 40.7357, -74.1724);
    const back = distanceInMiles(40.7357, -74.1724, 40.5008, -74.4474);
    expect(there).toBeCloseTo(back, 9);
  });

  it('puts New Brunswick to Newark at a plausible straight-line distance', () => {
    const miles = distanceInMiles(40.5008, -74.4474, 40.7357, -74.1724);
    expect(miles).toBeGreaterThan(20);
    expect(miles).toBeLessThan(25);
  });
});

describe('estimateGasCostSplit', () => {
  it('is (distance / mpg) x price-per-gallon, split across everyone in the car', () => {
    const split = estimateGasCostSplit(50, 3);
    const expectedTotal = (50 / ASSUMED_MPG) * PRICE_PER_GALLON;
    expect(split.totalGasCost).toBeCloseTo(expectedTotal, 10);
    expect(split.costPerPerson).toBeCloseTo(expectedTotal / 3, 10);
    expect(split.occupants).toBe(3);
  });

  it('shares the full cost exactly (per-person x occupants = total)', () => {
    const split = estimateGasCostSplit(37.5, 4);
    expect(split.costPerPerson * split.occupants).toBeCloseTo(split.totalGasCost, 10);
  });

  it('scales linearly with distance and inversely with occupants', () => {
    const base = estimateGasCostSplit(10, 2).costPerPerson;
    expect(estimateGasCostSplit(20, 2).costPerPerson).toBeCloseTo(base * 2, 10);
    expect(estimateGasCostSplit(10, 4).costPerPerson).toBeCloseTo(base / 2, 10);
  });

  it('has no time component: the calculator takes distance and occupants only', () => {
    expect(estimateGasCostSplit.length).toBe(2);
  });

  it('is deterministic — the same trip always costs the same', () => {
    expect(estimateGasCostSplit(18.2, 3)).toEqual(estimateGasCostSplit(18.2, 3));
  });

  it('costs nothing for a zero-distance trip', () => {
    expect(estimateGasCostSplit(0, 3).costPerPerson).toBe(0);
  });
});

describe('formatting', () => {
  it('formats currency to cents', () => {
    expect(formatCurrency(2.2)).toBe('$2.20');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats miles to one decimal', () => {
    expect(formatMiles(12.345)).toBe('12.3 mi');
  });
});
