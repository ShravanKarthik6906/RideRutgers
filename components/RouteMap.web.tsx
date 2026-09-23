import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, fontSizes } from '../constants/theme';

interface Props {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  liveLat?: number | null;
  liveLng?: number | null;
}

export function RouteMap({ originLat, originLng, destinationLat, destinationLng }: Props) {
  return (
    <View style={styles.mapWrapper}>
      <Text style={styles.placeholderText}>
        Map preview unavailable on web{'\n'}
        {originLat.toFixed(3)}, {originLng.toFixed(3)} → {destinationLat.toFixed(3)}, {destinationLng.toFixed(3)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrapper: {
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    padding: spacing.md,
  },
  placeholderText: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    textAlign: 'center',
  },
});
