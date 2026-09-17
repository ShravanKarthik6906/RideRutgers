import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type LatLng, type MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, radius, spacing, fontSizes } from '../constants/theme';

const RUTGERS_NEW_BRUNSWICK: LatLng = { latitude: 40.5008, longitude: -74.4474 };

export interface PickedLocation {
  label: string;
  latitude: number;
  longitude: number;
}

interface Props {
  label: string;
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}

export function MapPicker({ label, value, onChange }: Props) {
  const [region] = useState({
    ...RUTGERS_NEW_BRUNSWICK,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const handlePress = async (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    let placeLabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = results[0];
      if (place) {
        placeLabel = [place.name, place.street, place.city].filter(Boolean).join(', ');
      }
    } catch {
      // Reverse geocoding is best-effort; fall back to raw coordinates.
    }
    onChange({ label: placeLabel, latitude, longitude });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{value ? value.label : 'Tap the map to drop a pin'}</Text>
      <View style={styles.mapWrapper}>
        <MapView style={styles.map} initialRegion={region} onPress={handlePress}>
          {value ? <Marker coordinate={{ latitude: value.latitude, longitude: value.longitude }} /> : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 4,
  },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  mapWrapper: {
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  map: {
    flex: 1,
  },
});
