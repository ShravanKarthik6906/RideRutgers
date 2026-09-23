import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import type { DriverPresence, Ride, RideRequest } from '../lib/types';

const RUTGERS_NEW_BRUNSWICK = { latitude: 40.5008, longitude: -74.4474 };

interface Props {
  rides: Ride[];
  requests: RideRequest[];
  onlineDrivers: DriverPresence[];
  onSelectRide: (ride: Ride) => void;
  onSelectRequest: (request: RideRequest) => void;
}

export function LiveMap({ rides, requests, onlineDrivers, onSelectRide, onSelectRequest }: Props) {
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
      {requests.map((request) => (
        <Marker
          key={`request-${request.id}`}
          coordinate={{ latitude: request.origin_lat, longitude: request.origin_lng }}
          pinColor={colors.gray600}
          title={`${request.origin_label} → ${request.destination_label}`}
          description={`${request.rider?.full_name ?? 'A student'} is looking for a ride`}
          onCalloutPress={() => onSelectRequest(request)}
        />
      ))}
      {onlineDrivers.map((presence) => (
        <Marker
          key={`driver-${presence.driver_id}`}
          coordinate={{ latitude: presence.lat, longitude: presence.lng }}
          title={presence.driver?.full_name ?? 'Online driver'}
          description="Online now"
        >
          <View style={styles.driverDot}>
            <Ionicons name="car" size={14} color={colors.white} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  driverDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
