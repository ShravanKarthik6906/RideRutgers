import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, radius } from '../constants/theme';
import type { Ride } from '../lib/types';

interface Props {
  rides: Ride[];
  onSelectRide: (ride: Ride) => void;
}

export function TripsMap({ rides, onSelectRide }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Map preview unavailable on web — showing the same posted trips as a list.</Text>
      </View>
      <FlatList
        data={rides}
        keyExtractor={(ride) => ride.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelectRide(item)}>
            <Ionicons name="navigate" size={18} color={colors.scarlet} style={styles.rowIcon} />
            <Text style={styles.rowText}>
              {item.origin_label} → {item.destination_label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    backgroundColor: colors.gray100,
    padding: spacing.sm,
  },
  bannerText: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    textAlign: 'center',
  },
  list: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    marginRight: spacing.sm,
  },
  rowText: {
    fontSize: fontSizes.sm,
    color: colors.gray800,
    fontWeight: '600',
    flexShrink: 1,
  },
});
