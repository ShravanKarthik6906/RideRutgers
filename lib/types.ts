export type DriverVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type RideStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
export type RideRequestStatus = 'open' | 'matched' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_driver_verified: boolean;
  driver_verification_status: DriverVerificationStatus;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface Ride {
  id: string;
  driver_id: string;
  origin_label: string;
  origin_lat: number;
  origin_lng: number;
  destination_label: string;
  destination_lat: number;
  destination_lng: number;
  distance_miles: number;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  cost_per_person: number;
  status: RideStatus;
  live_lat: number | null;
  live_lng: number | null;
  live_updated_at: string | null;
  created_at: string;
  driver?: Profile;
}

export interface RideRequest {
  id: string;
  rider_id: string;
  origin_label: string;
  origin_lat: number;
  origin_lng: number;
  destination_label: string;
  destination_lat: number;
  destination_lng: number;
  requested_time: string;
  status: RideRequestStatus;
  created_at: string;
  rider?: Profile;
}

export interface Booking {
  id: string;
  ride_id: string;
  rider_id: string;
  seats_booked: number;
  status: BookingStatus;
  created_at: string;
  ride?: Ride;
  rider?: Profile;
}

export interface RideMessage {
  id: string;
  ride_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Profile;
}

// A location chosen on the map picker, with a human-readable label.
export interface PickedLocation {
  label: string;
  latitude: number;
  longitude: number;
}
