import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, fontSizes } from '../constants/theme';
import { formatWhen } from '../lib/format';
import type { RideRequest } from '../lib/types';

// Only ever shown to the rider who created the request — it's never a public
// feed, so this reads first-person ("you're looking for") rather than
// broadcasting the rider's identity to anyone browsing.
export function RideRequestCard({
  request,
  matchCount,
  onCancel,
}: {
  request: RideRequest;
  matchCount: number;
  onCancel: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.when}>{formatWhen(request.requested_time)}</Text>

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
        <Text style={matchCount > 0 ? styles.matchText : styles.noMatchText}>
          {matchCount > 0
            ? `${matchCount} matching trip${matchCount === 1 ? '' : 's'} posted — check the Ride Board`
            : "No matching trips posted yet — we'll keep watching."}
        </Text>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
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
  when: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.sm,
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
  matchText: {
    fontSize: fontSizes.xs,
    color: colors.success,
    fontWeight: '700',
    flexShrink: 1,
  },
  noMatchText: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    flexShrink: 1,
  },
  cancelText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.danger,
    marginLeft: spacing.sm,
  },
});
