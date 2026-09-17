import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { fetchMyBookings, fetchRidesByDriver } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { RideCard } from '../../components/RideCard';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, fontSizes } from '../../constants/theme';
import type { Ride } from '../../lib/types';

type Row = { ride: Ride; role: 'driver' | 'rider' };

export default function MyRides() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [driverRides, bookings] = await Promise.all([
        fetchRidesByDriver(session.user.id),
        fetchMyBookings(session.user.id),
      ]);
      const riderRows: Row[] = bookings
        .filter((b) => b.ride && b.status !== 'declined' && b.status !== 'cancelled')
        .map((b) => ({ ride: b.ride as Ride, role: 'rider' as const }));
      const driverRows: Row[] = driverRides.map((r) => ({ ride: r, role: 'driver' as const }));
      const merged = [...driverRows, ...riderRows].sort(
        (a, b) => new Date(b.ride.departure_time).getTime() - new Date(a.ride.departure_time).getTime()
      );
      setRows(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('my-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const upcoming = useMemo(
    () => rows.filter((r) => r.ride.status === 'scheduled' || r.ride.status === 'in_progress'),
    [rows]
  );
  const past = useMemo(
    () => rows.filter((r) => r.ride.status === 'completed' || r.ride.status === 'cancelled'),
    [rows]
  );

  const sections = [
    { title: 'Upcoming', data: upcoming },
    { title: 'Past', data: past },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Rides</Text>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.title}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.scarlet}
          />
        }
        renderItem={({ item: section }) => (
          <View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.length === 0 ? (
              <EmptyState
                title={section.title === 'Upcoming' ? 'No upcoming rides' : 'No past rides yet'}
                subtitle={
                  section.title === 'Upcoming'
                    ? 'Post a ride or request to join one from the Ride Board.'
                    : undefined
                }
              />
            ) : (
              section.data.map((row) => (
                <View key={row.ride.id}>
                  <Text style={styles.roleTag}>{row.role === 'driver' ? 'You are driving' : 'You are riding'}</Text>
                  <RideCard ride={row.ride} onPress={() => router.push(`/ride/${row.ride.id}`)} />
                </View>
              ))
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No rides yet" /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.black,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray600,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  roleTag: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.scarlet,
    paddingHorizontal: spacing.md + spacing.md,
    marginBottom: 2,
  },
});
