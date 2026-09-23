import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';

interface Props {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  liveLat?: number | null;
  liveLng?: number | null;
}

export function RouteMap({ originLat, originLng, destinationLat, destinationLng, liveLat, liveLng }: Props) {
  const showLive = liveLat != null && liveLng != null;

  return (
    <View style={styles.mapWrapper}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (originLat + destinationLat) / 2,
          longitude: (originLng + destinationLng) / 2,
          latitudeDelta: Math.max(0.05, Math.abs(originLat - destinationLat) * 1.8),
          longitudeDelta: Math.max(0.05, Math.abs(originLng - destinationLng) * 1.8),
        }}
      >
        <Marker coordinate={{ latitude: originLat, longitude: originLng }} pinColor={colors.scarlet} />
        <Marker coordinate={{ latitude: destinationLat, longitude: destinationLng }} pinColor={colors.black} />
        <Polyline
          coordinates={[
            { latitude: originLat, longitude: originLng },
            { latitude: destinationLat, longitude: destinationLng },
          ]}
          strokeColor={colors.gray400}
          strokeWidth={2}
          lineDashPattern={[6, 6]}
        />
        {showLive && (
          <Marker coordinate={{ latitude: liveLat!, longitude: liveLng! }}>
            <View style={styles.liveDot}>
              <Ionicons name="car" size={16} color={colors.white} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  map: {
    flex: 1,
  },
  liveDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
