import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../constants/theme';
import type { Ride } from '../lib/types';

const RUTGERS_NEW_BRUNSWICK = { latitude: 40.5008, longitude: -74.4474 };

interface Props {
  rides: Ride[];
  onSelectRide: (ride: Ride) => void;
}

// Visualizes posted, scheduled trips only — never live driver availability,
// and never rider requests (those are private to their rider; see
// lib/matching.ts and migration 0004). Design intent: trips are posted in
// advance by drivers who were already making them.
export function TripsMap({ rides, onSelectRide }: Props) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{ ...RUTGERS_NEW_BRUNSWICK, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
      showsUserLocation
    >
      {rides.map((ride) => (
        <Marker
          key={`ride-${ride.id}`}
          coordinate={{ latitude: ride.origin_lat, longitude: ride.origin_lng }}
          pinColor={colors.scarlet}
          title={`${ride.origin_label} → ${ride.destination_label}`}
          description={`${ride.driver?.full_name ?? 'Driver'} · ${ride.seats_available} seat(s) left`}
          onCalloutPress={() => onSelectRide(ride)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
