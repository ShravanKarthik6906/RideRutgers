import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchOpenRideRequests, fetchUpcomingRides } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { RideCard } from '../../components/RideCard';
import { RideRequestCard } from '../../components/RideRequestCard';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';
import type { Ride, RideRequest } from '../../lib/types';

type BoardView = 'rides' | 'requests';

export default function Board() {
  const [view, setView] = useState<BoardView>('rides');
  const [rides, setRides] = useState<Ride[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rideData, requestData] = await Promise.all([fetchUpcomingRides(), fetchOpenRideRequests()]);
      setRides(rideData);
      setRequests(requestData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('rides-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filteredRides = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rides;
    return rides.filter(
      (r) => r.origin_label.toLowerCase().includes(q) || r.destination_label.toLowerCase().includes(q)
    );
  }, [rides, query]);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) => r.origin_label.toLowerCase().includes(q) || r.destination_label.toLowerCase().includes(q)
    );
  }, [requests, query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride Board</Text>
        <Pressable style={styles.postButton} onPress={() => router.push('/post-ride')}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.postButtonText}>Post</Text>
        </Pressable>
      </View>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segmentButton, view === 'rides' && styles.segmentButtonActive]}
          onPress={() => setView('rides')}
        >
          <Text style={[styles.segmentText, view === 'rides' && styles.segmentTextActive]}>Rides</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, view === 'requests' && styles.segmentButtonActive]}
          onPress={() => setView('requests')}
        >
          <Text style={[styles.segmentText, view === 'requests' && styles.segmentTextActive]}>Requests</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by origin or destination"
          placeholderTextColor={colors.gray400}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {view === 'rides' ? (
        <FlatList
          data={filteredRides}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <RideCard ride={item} onPress={() => router.push(`/ride/${item.id}`)} />}
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
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No rides posted yet"
                subtitle="Be the first to post a ride, or check back soon."
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <RideRequestCard request={item} />}
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
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No open requests"
                subtitle="When a student requests a ride, it'll show up here."
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.black,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: 4,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.white,
  },
  segmentText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray600,
  },
  segmentTextActive: {
    color: colors.scarlet,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.scarlet,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  postButtonText: {
    color: colors.white,
    fontWeight: '700',
    marginLeft: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
