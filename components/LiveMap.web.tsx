import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, radius } from '../constants/theme';
import type { DriverPresence, Ride, RideRequest } from '../lib/types';

interface Props {
  rides: Ride[];
  requests: RideRequest[];
  onlineDrivers: DriverPresence[];
  onSelectRide: (ride: Ride) => void;
  onSelectRequest: (request: RideRequest) => void;
}

type Row =
  | { kind: 'driver'; key: string; presence: DriverPresence }
  | { kind: 'ride'; key: string; ride: Ride }
  | { kind: 'request'; key: string; request: RideRequest };

export function LiveMap({ rides, requests, onlineDrivers, onSelectRide, onSelectRequest }: Props) {
  const rows: Row[] = [
    ...onlineDrivers.map((presence) => ({ kind: 'driver' as const, key: `driver-${presence.driver_id}`, presence })),
    ...rides.map((ride) => ({ kind: 'ride' as const, key: `ride-${ride.id}`, ride })),
    ...requests.map((request) => ({ kind: 'request' as const, key: `request-${request.id}`, request })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Map preview unavailable on web — showing the same live data as a list.</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (item.kind === 'driver') {
            return (
              <View style={styles.row}>
                <Ionicons name="car" size={18} color={colors.success} style={styles.rowIcon} />
                <Text style={styles.rowText}>{item.presence.driver?.full_name ?? 'Online driver'} · online now</Text>
              </View>
            );
          }
          if (item.kind === 'ride') {
            return (
              <Pressable style={styles.row} onPress={() => onSelectRide(item.ride)}>
                <Ionicons name="navigate" size={18} color={colors.scarlet} style={styles.rowIcon} />
                <Text style={styles.rowText}>
                  {item.ride.origin_label} → {item.ride.destination_label}
                </Text>
              </Pressable>
            );
          }
          return (
            <Pressable style={styles.row} onPress={() => onSelectRequest(item.request)}>
              <Ionicons name="person" size={18} color={colors.gray600} style={styles.rowIcon} />
              <Text style={styles.rowText}>
                {item.request.origin_label} → {item.request.destination_label}
              </Text>
            </Pressable>
          );
        }}
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
