// Gas-cost-split constants for the trip cost estimate.
//
// RideRutgers must stay within New Jersey's informal-carpool exemption rather
// than operating like a Transportation Network Company (which would require a
// $1.5M commercial insurance policy and an MVC permit). That means pricing is
// a distance-only gas cost estimate split evenly among everyone in the car —
// never a time-based fare, surge pricing, or a per-rider negotiated price.
//
// These are fixed placeholder assumptions, not per-driver/per-trip inputs.
// Update them here if NJ gas prices move meaningfully; nothing else in the
// app should need to change.
export const ASSUMED_MPG = 25;
export const PRICE_PER_GALLON = 3.3;
