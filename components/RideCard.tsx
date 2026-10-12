import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, fontSizes } from '../constants/theme';
import { formatWhen } from '../lib/format';
import { formatCurrency, formatMiles } from '../lib/pricing';
import { StatusBadge } from './StatusBadge';
import type { Ride } from '../lib/types';

export function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.when}>{formatWhen(ride.departure_time)}</Text>
        <StatusBadge status={ride.status} />
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeDots}>
          <View style={styles.dotOrigin} />
          <View style={styles.line} />
          <View style={styles.dotDestination} />
        </View>
        <View style={styles.routeLabels}>
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.origin_label}
          </Text>
          <Text style={styles.routeText} numberOfLines={1}>
            {ride.destination_label}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.driverNameRow}>
          <Text style={styles.driverName} numberOfLines={1}>
            {ride.driver?.full_name ?? 'Verified driver'} · ★ {ride.driver?.rating_avg?.toFixed(1) ?? '5.0'}
          </Text>
          {ride.driver?.is_driver_verified && (
            <Ionicons name="checkmark-circle" size={13} color={colors.success} style={styles.verifiedIcon} />
          )}
        </View>
        <View style={styles.footerRight}>
          <Text style={styles.seats}>{ride.seats_available} seat{ride.seats_available === 1 ? '' : 's'} left</Text>
          <Text style={styles.price}>
            {formatCurrency(ride.cost_per_person)}/person · {formatMiles(ride.distance_miles)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  when: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
  },
  routeRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  routeDots: {
    alignItems: 'center',
    width: 16,
    marginRight: spacing.sm,
    paddingTop: 4,
  },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.scarlet,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: colors.gray200,
    marginVertical: 2,
  },
  dotDestination: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.black,
  },
  routeLabels: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeText: {
    fontSize: fontSizes.md,
    color: colors.gray800,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.sm,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  driverName: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  seats: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
  },
  price: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.scarlet,
  },
});
