import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, fontSizes } from '../constants/theme';
import { StatusBadge } from './StatusBadge';
import type { RideRequest } from '../lib/types';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dateStr = isToday
    ? 'Today'
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
}

export function RideRequestCard({ request }: { request: RideRequest }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.when}>{formatWhen(request.requested_time)}</Text>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeDots}>
          <View style={styles.dotOrigin} />
          <View style={styles.line} />
          <View style={styles.dotDestination} />
        </View>
        <View style={styles.routeLabels}>
          <Text style={styles.routeText} numberOfLines={1}>
            {request.origin_label}
          </Text>
          <Text style={styles.routeText} numberOfLines={1}>
            {request.destination_label}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.riderName}>
          {request.rider?.full_name ?? 'A Rutgers student'} is looking for a ride
        </Text>
      </View>
    </View>
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
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.sm,
  },
  riderName: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
  },
});
