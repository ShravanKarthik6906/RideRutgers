// Gas-cost-split constants for the trip cost estimate.
//
// Design intent: the app shows a distance-only estimate of a trip's gas cost,
// split evenly among everyone in the car (driver included) — never a
// time-based fare, surge pricing, or a per-rider negotiated price — so a trip
// reads as sharing the driver's own travel costs rather than selling a ride.
// This is a product-design choice, not legal advice; see the README.
//
// These are fixed placeholder assumptions, not per-driver/per-trip inputs.
// Update them here if NJ gas prices move meaningfully; nothing else in the
// app should need to change.
export const ASSUMED_MPG = 25;
export const PRICE_PER_GALLON = 3.3;
