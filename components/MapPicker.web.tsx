import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors, radius, spacing, fontSizes } from '../constants/theme';
import type { PickedLocation } from '../lib/types';

const RUTGERS_NEW_BRUNSWICK = { latitude: 40.5008, longitude: -74.4474 };

interface Props {
  label: string;
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}

export function MapPicker({ label, value, onChange }: Props) {
  const handlePress = () => {
    onChange({ label: 'Rutgers New Brunswick', ...RUTGERS_NEW_BRUNSWICK });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{value ? value.label : 'Tap to drop a pin'}</Text>
      <Pressable style={styles.mapWrapper} onPress={handlePress}>
        <Text style={styles.placeholderText}>Map preview unavailable on web{'\n'}(tap to use Rutgers New Brunswick)</Text>
      </Pressable>
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
