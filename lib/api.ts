import { supabase } from './supabase';
import { distanceInMiles, flatRatePrice } from './pricing';
import type { Booking, Profile, Ride, RideMessage, RideRequest } from './types';

const RIDE_SELECT = '*, driver:profiles!rides_driver_id_fkey(*)';
const BOOKING_SELECT = '*, ride:rides(*, driver:profiles!rides_driver_id_fkey(*)), rider:profiles!bookings_rider_id_fkey(*)';

export async function fetchUpcomingRides(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(RIDE_SELECT)
    .in('status', ['scheduled', 'in_progress'])
    .gte('departure_time', new Date(Date.now() - 1000 * 60 * 60).toISOString())
    .order('departure_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Ride[];
}

export async function fetchRidesByDriver(driverId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select(RIDE_SELECT)
    .eq('driver_id', driverId)
    .order('departure_time', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Ride[];
}

export async function fetchRide(id: string): Promise<Ride> {
  const { data, error } = await supabase.from('rides').select(RIDE_SELECT).eq('id', id).single();
  if (error) throw error;
  return data as unknown as Ride;
}

export interface CreateRideInput {
  driverId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  departureTime: string;
  seatsTotal: number;
}

export async function createRide(input: CreateRideInput): Promise<Ride> {
  const distance = distanceInMiles(input.originLat, input.originLng, input.destinationLat, input.destinationLng);
  const price = flatRatePrice(distance);
  const { data, error } = await supabase
    .from('rides')
    .insert({
      driver_id: input.driverId,
      origin_label: input.originLabel,
      origin_lat: input.originLat,
      origin_lng: input.originLng,
      destination_label: input.destinationLabel,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      distance_miles: Math.round(distance * 10) / 10,
      departure_time: input.departureTime,
      seats_total: input.seatsTotal,
      seats_available: input.seatsTotal,
      price_per_seat: price,
    })
    .select(RIDE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Ride;
}

export async function updateRideStatus(rideId: string, status: Ride['status']): Promise<void> {
  const { error } = await supabase.from('rides').update({ status }).eq('id', rideId);
  if (error) throw error;
}

export async function updateRideLiveLocation(rideId: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase
    .from('rides')
    .update({ live_lat: lat, live_lng: lng, live_updated_at: new Date().toISOString() })
    .eq('id', rideId);
  if (error) throw error;
}

export async function cancelRide(rideId: string): Promise<void> {
  await updateRideStatus(rideId, 'cancelled');
}

// ---- Ride requests (riders looking for a ride) ----

export async function fetchOpenRideRequests(): Promise<RideRequest[]> {
  const { data, error } = await supabase
    .from('ride_requests')
    .select('*, rider:profiles!ride_requests_rider_id_fkey(*)')
    .eq('status', 'open')
    .order('requested_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RideRequest[];
}

export interface CreateRideRequestInput {
  riderId: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  requestedTime: string;
}

export async function createRideRequest(input: CreateRideRequestInput): Promise<RideRequest> {
  const { data, error } = await supabase
    .from('ride_requests')
    .insert({
      rider_id: input.riderId,
      origin_label: input.originLabel,
      origin_lat: input.originLat,
      origin_lng: input.originLng,
      destination_label: input.destinationLabel,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      requested_time: input.requestedTime,
    })
    .select('*, rider:profiles!ride_requests_rider_id_fkey(*)')
    .single();
  if (error) throw error;
  return data as unknown as RideRequest;
}

// ---- Bookings ----

export async function fetchMyBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('rider_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Booking[];
}

export async function fetchBookingsForRide(rideId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Booking[];
}

export async function requestToJoinRide(rideId: string, riderId: string, seats = 1): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ride_id: rideId, rider_id: riderId, seats_booked: seats })
    .select(BOOKING_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Booking;
}

export async function respondToBooking(bookingId: string, status: 'confirmed' | 'declined'): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
  if (error) throw error;

  if (status === 'confirmed') {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('ride_id, seats_booked')
      .eq('id', bookingId)
      .single();
    if (fetchError) throw fetchError;
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('seats_available')
      .eq('id', booking!.ride_id)
      .single();
    if (rideError) throw rideError;
    const nextSeats = Math.max(0, ride!.seats_available - booking!.seats_booked);
    await supabase.from('rides').update({ seats_available: nextSeats }).eq('id', booking!.ride_id);
  }
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;
}

// ---- Messages ----

export async function fetchMessages(rideId: string): Promise<RideMessage[]> {
  const { data, error } = await supabase
    .from('ride_messages')
    .select('*, sender:profiles!ride_messages_sender_id_fkey(*)')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as RideMessage[];
}

export async function sendMessage(rideId: string, senderId: string, body: string): Promise<void> {
  const { error } = await supabase.from('ride_messages').insert({ ride_id: rideId, sender_id: senderId, body });
  if (error) throw error;
}

// ---- Driver verification ----

export async function applyForDriverVerification(input: {
  userId: string;
  licenseNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
}): Promise<void> {
  const { error } = await supabase.from('driver_applications').insert({
    user_id: input.userId,
    license_number: input.licenseNumber,
    vehicle_make: input.vehicleMake,
    vehicle_model: input.vehicleModel,
    vehicle_plate: input.vehiclePlate,
  });
  if (error) throw error;
  await supabase.from('profiles').update({ driver_verification_status: 'pending' }).eq('id', input.userId);
}

// ---- Profile ----

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}

// ---- Ratings ----

export async function submitRating(input: {
  rideId: string;
  raterId: string;
  rateeId: string;
  stars: number;
  comment?: string;
}): Promise<void> {
  const { error } = await supabase.from('ratings').insert({
    ride_id: input.rideId,
    rater_id: input.raterId,
    ratee_id: input.rateeId,
    stars: input.stars,
    comment: input.comment,
  });
  if (error) throw error;
}
