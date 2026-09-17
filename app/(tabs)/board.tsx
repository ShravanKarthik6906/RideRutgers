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
import { fetchUpcomingRides } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { RideCard } from '../../components/RideCard';
import { EmptyState } from '../../components/EmptyState';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';
import type { Ride } from '../../lib/types';

export default function Board() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchUpcomingRides();
      setRides(data);
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rides;
    return rides.filter(
      (r) => r.origin_label.toLowerCase().includes(q) || r.destination_label.toLowerCase().includes(q)
    );
  }, [rides, query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride Board</Text>
        <Pressable style={styles.postButton} onPress={() => router.push('/post-ride')}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.postButtonText}>Post</Text>
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

      <FlatList
        data={filtered}
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
