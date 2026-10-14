import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors, radius, spacing, fontSizes } from '../constants/theme';
import type { Ride } from '../lib/types';

const RUTGERS_NEW_BRUNSWICK = { latitude: 40.5008, longitude: -74.4474 };
const EDGE_PADDING = { top: 80, right: 56, bottom: 56, left: 56 };

interface Props {
  rides: Ride[];
  onSelectRide: (ride: Ride) => void;
}

// Visualizes posted, scheduled trips only — never live driver availability,
// and never rider requests (those are private to their rider; see
// lib/matching.ts and migration 0004). Design intent: trips are posted in
// advance by drivers who were already making them.
//
// Each trip is a pickup pin, a drop-off pin and a straight dashed line between
// them (a visual aid, not a driving route). The map fits all pins once when it
// opens, and doesn't re-fit on later updates so it won't jump while you pan.
export function TripsMap({ rides, onSelectRide }: Props) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const hasFit = useRef(false);

  useEffect(() => {
    if (!mapReady || hasFit.current || rides.length === 0) return;
    const coordinates = rides.flatMap((ride) => [
      { latitude: ride.origin_lat, longitude: ride.origin_lng },
      { latitude: ride.destination_lat, longitude: ride.destination_lng },
    ]);
    mapRef.current?.fitToCoordinates(coordinates, { edgePadding: EDGE_PADDING, animated: false });
    hasFit.current = true;
  }, [mapReady, rides]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...RUTGERS_NEW_BRUNSWICK, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onMapReady={() => setMapReady(true)}
        showsUserLocation
      >
        {rides.map((ride) => {
          const origin = { latitude: ride.origin_lat, longitude: ride.origin_lng };
          const destination = { latitude: ride.destination_lat, longitude: ride.destination_lng };
          const driver = ride.driver?.full_name ?? 'Driver';
          const seats = `${ride.seats_available} seat${ride.seats_available === 1 ? '' : 's'} left`;
          return (
            <React.Fragment key={ride.id}>
              <Polyline
                coordinates={[origin, destination]}
                strokeColor={colors.gray600}
                strokeWidth={2}
                lineDashPattern={[6, 6]}
              />
              <Marker
                coordinate={origin}
                pinColor={colors.scarlet}
                title={`Pickup · ${ride.origin_label}`}
                description={`To ${ride.destination_label} · ${driver} · ${seats}`}
                onCalloutPress={() => onSelectRide(ride)}
              />
              <Marker
                coordinate={destination}
                pinColor={colors.black}
                title={`Drop-off · ${ride.destination_label}`}
                description={`From ${ride.origin_label} · ${driver} · ${seats}`}
                onCalloutPress={() => onSelectRide(ride)}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      <View style={styles.legend} pointerEvents="none">
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.scarlet }]} />
          <Text style={styles.legendText}>Pickup</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.black }]} />
          <Text style={styles.legendText}>Drop-off</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.gray800,
  },
});
