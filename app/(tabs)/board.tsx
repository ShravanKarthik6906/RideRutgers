import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../lib/auth';
import { fetchOnlineDrivers, fetchOpenRideRequests, fetchUpcomingRides, goOffline, updateMyPresence } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { LiveMap } from '../../components/LiveMap';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';
import type { DriverPresence, Ride, RideRequest } from '../../lib/types';

export default function Board() {
  const { session, profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverPresence[]>([]);
  const [online, setOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async () => {
    const [rideData, requestData, driverData] = await Promise.all([
      fetchUpcomingRides(),
      fetchOpenRideRequests(),
      fetchOnlineDrivers(),
    ]);
    setRides(rideData);
    setRequests(requestData);
    setOnlineDrivers(driverData);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('live-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_presence' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const stopBroadcasting = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (session) goOffline(session.user.id).catch(() => {});
    setOnline(false);
  }, [session]);

  const startBroadcasting = useCallback(async () => {
    if (!session) return;
    setTogglingOnline(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Enable location access to go online for nearby riders to see you.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateMyPresence(session.user.id, position.coords.latitude, position.coords.longitude);
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
        (loc) => updateMyPresence(session.user.id, loc.coords.latitude, loc.coords.longitude)
      );
      setOnline(true);
    } finally {
      setTogglingOnline(false);
    }
  }, [session]);

  // "Online" only counts while the app is in the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && watchRef.current) {
        stopBroadcasting();
      }
    });
    return () => sub.remove();
  }, [stopBroadcasting]);

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
      if (watchRef.current && session) goOffline(session.user.id).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGoOnline = !!profile?.is_driver_verified;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Map</Text>
        <Pressable style={styles.postButton} onPress={() => router.push('/post-ride')}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.postButtonText}>Post</Text>
        </Pressable>
      </View>

      <View style={styles.mapWrapper}>
        <LiveMap
          rides={rides}
          requests={requests}
          onlineDrivers={onlineDrivers}
          onSelectRide={(ride) => router.push(`/ride/${ride.id}`)}
          onSelectRequest={(request) =>
            Alert.alert(
              `${request.origin_label} → ${request.destination_label}`,
              `${request.rider?.full_name ?? 'A student'} is looking for a ride around ${new Date(
                request.requested_time
              ).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.`
            )
          }
        />

        {canGoOnline && (
          <Pressable
            style={[styles.onlinePill, online && styles.onlinePillActive]}
            onPress={online ? stopBroadcasting : startBroadcasting}
            disabled={togglingOnline}
          >
            <View style={[styles.onlineDot, online && styles.onlineDotActive]} />
            <Text style={[styles.onlineText, online && styles.onlineTextActive]}>
              {online ? 'Online — tap to go offline' : 'Go online'}
            </Text>
          </Pressable>
        )}
      </View>
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
  mapWrapper: {
    flex: 1,
  },
  onlinePill: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  onlinePillActive: {
    backgroundColor: colors.success,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray400,
    marginRight: spacing.xs,
  },
  onlineDotActive: {
    backgroundColor: colors.white,
  },
  onlineText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
  },
  onlineTextActive: {
    color: colors.white,
  },
});
