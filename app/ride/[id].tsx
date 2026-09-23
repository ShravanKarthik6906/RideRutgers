import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  cancelBooking,
  cancelRide,
  fetchBookingsForRide,
  fetchMessages,
  fetchRide,
  requestToJoinRide,
  respondToBooking,
  sendMessage,
  submitRating,
  updateRideLiveLocation,
  updateRideStatus,
} from '../../lib/api';
import { shareCurrentLocation } from '../../lib/location';
import { StatusBadge } from '../../components/StatusBadge';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RouteMap } from '../../components/RouteMap';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';
import { formatCurrency, formatMiles } from '../../lib/pricing';
import type { Booking, Ride, RideMessage } from '../../lib/types';

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  const isDriver = !!session && ride?.driver_id === session.user.id;
  const myBooking = useMemo(
    () => bookings.find((b) => b.rider_id === session?.user.id),
    [bookings, session]
  );

  const load = useCallback(async () => {
    if (!id) return;
    const [rideData, bookingData, messageData] = await Promise.all([
      fetchRide(id),
      fetchBookingsForRide(id),
      fetchMessages(id),
    ]);
    setRide(rideData);
    setBookings(bookingData);
    setMessages(messageData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ride-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${id}` }, (payload) => {
        setRide((prev) => (prev ? { ...prev, ...(payload.new as Partial<Ride>) } : prev));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `ride_id=eq.${id}` }, () =>
        fetchBookingsForRide(id).then(setBookings)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `ride_id=eq.${id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as RideMessage])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    return () => {
      watchSubscription.current?.remove();
    };
  }, []);

  const toggleLocationSharing = async () => {
    if (!ride) return;
    if (sharingLocation) {
      watchSubscription.current?.remove();
      watchSubscription.current = null;
      setSharingLocation(false);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setSharingLocation(true);
    watchSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
      (loc) => updateRideLiveLocation(ride.id, loc.coords.latitude, loc.coords.longitude)
    );
  };

  const handleStartTrip = async () => {
    if (!ride) return;
    setBusy(true);
    await updateRideStatus(ride.id, 'in_progress');
    setBusy(false);
  };

  const handleCompleteTrip = async () => {
    if (!ride) return;
    setBusy(true);
    watchSubscription.current?.remove();
    watchSubscription.current = null;
    setSharingLocation(false);
    await updateRideStatus(ride.id, 'completed');
    setBusy(false);
  };

  const handleCancelRide = async () => {
    if (!ride) return;
    setBusy(true);
    await cancelRide(ride.id);
    setBusy(false);
  };

  const handleJoin = async () => {
    if (!ride || !session) return;
    setBusy(true);
    try {
      await requestToJoinRide(ride.id, session.user.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!myBooking) return;
    setBusy(true);
    await cancelBooking(myBooking.id);
    setBusy(false);
  };

  const handleRespond = async (bookingId: string, status: 'confirmed' | 'declined') => {
    setBusy(true);
    await respondToBooking(bookingId, status);
    setBusy(false);
  };

  const handleSend = async () => {
    if (!session || !messageText.trim() || !ride) return;
    const body = messageText.trim();
    setMessageText('');
    await sendMessage(ride.id, session.user.id, body);
  };

  const handleShareLocation = async () => {
    try {
      await shareCurrentLocation('Here is my current location');
    } catch (e) {
      Alert.alert('Could not share location', e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const handleSOS = () => {
    Alert.alert('Emergency', 'What do you need to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share my location', onPress: handleShareLocation },
      { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
    ]);
  };

  const canMessage =
    isDriver || (myBooking && ['pending', 'confirmed', 'completed'].includes(myBooking.status));

  if (loading || !ride) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.scarlet} size="large" />
      </View>
    );
  }

  const showLiveMap = ride.status === 'in_progress' && ride.live_lat != null && ride.live_lng != null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <StatusBadge status={ride.status} />
          <Text style={styles.price}>{formatCurrency(ride.price_per_seat)} / seat</Text>
        </View>

        <Text style={styles.route}>
          {ride.origin_label} → {ride.destination_label}
        </Text>
        <Text style={styles.meta}>
          {new Date(ride.departure_time).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · {formatMiles(ride.distance_miles)} · {ride.seats_available}/{ride.seats_total} seats open
        </Text>
        <View style={styles.driverRow}>
          <Text style={styles.driver}>
            Driver: {ride.driver?.full_name ?? 'Verified driver'} (★ {ride.driver?.rating_avg?.toFixed(1) ?? '5.0'})
          </Text>
          {ride.driver?.is_driver_verified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.success} style={styles.verifiedIcon} />
          )}
        </View>

        {ride.status === 'in_progress' && (
          <View style={styles.emergencyRow}>
            <Pressable style={styles.shareLocationButton} onPress={handleShareLocation}>
              <Ionicons name="location" size={16} color={colors.scarlet} />
              <Text style={styles.shareLocationText}>Share my location</Text>
            </Pressable>
            <Pressable style={styles.sosButton} onPress={handleSOS}>
              <Ionicons name="warning" size={16} color={colors.white} />
              <Text style={styles.sosText}>SOS</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.settleNote}>
          Price is an estimate to settle up directly with the driver (Venmo, Zelle, cash, etc.) — RideRutgers
          doesn't process payments.
        </Text>

        <RouteMap
          originLat={ride.origin_lat}
          originLng={ride.origin_lng}
          destinationLat={ride.destination_lat}
          destinationLng={ride.destination_lng}
          liveLat={showLiveMap ? ride.live_lat : null}
          liveLng={showLiveMap ? ride.live_lng : null}
        />

        {isDriver ? (
          <DriverControls
            ride={ride}
            bookings={bookings}
            busy={busy}
            sharingLocation={sharingLocation}
            onStart={handleStartTrip}
            onComplete={handleCompleteTrip}
            onCancel={handleCancelRide}
            onToggleSharing={toggleLocationSharing}
            onRespond={handleRespond}
          />
        ) : (
          <RiderControls
            ride={ride}
            booking={myBooking}
            busy={busy}
            onJoin={handleJoin}
            onCancel={handleCancelBooking}
          />
        )}

        {ride.status === 'completed' && session && (isDriver || myBooking?.status === 'completed') && (
          <RatingSection
            ride={ride}
            bookings={bookings}
            isDriver={isDriver}
            currentUserId={session.user.id}
          />
        )}

        {canMessage && (
          <View style={styles.chatSection}>
            <Text style={styles.sectionTitle}>Messages</Text>
            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.sender_id === session?.user.id ? styles.messageMine : styles.messageTheirs,
                  ]}
                >
                  <Text style={styles.messageText}>{item.body}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyMessages}>No messages yet.</Text>}
            />
            <View style={styles.messageInputRow}>
              <TextInput
                style={styles.messageInput}
                placeholder="Message the driver/rider..."
                placeholderTextColor={colors.gray400}
                value={messageText}
                onChangeText={setMessageText}
              />
              <Pressable style={styles.sendButton} onPress={handleSend}>
                <Ionicons name="send" size={18} color={colors.white} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DriverControls({
  ride,
  bookings,
  busy,
  sharingLocation,
  onStart,
  onComplete,
  onCancel,
  onToggleSharing,
  onRespond,
}: {
  ride: Ride;
  bookings: Booking[];
  busy: boolean;
  sharingLocation: boolean;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onToggleSharing: () => void;
  onRespond: (bookingId: string, status: 'confirmed' | 'declined') => void;
}) {
  const pending = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Requests to join</Text>
      {pending.length === 0 && confirmed.length === 0 ? (
        <Text style={styles.meta}>No riders yet.</Text>
      ) : (
        <>
          {pending.map((b) => (
            <View key={b.id} style={styles.bookingRow}>
              <Text style={styles.bookingName}>{b.rider?.full_name ?? 'Rider'}</Text>
              <View style={styles.bookingActions}>
                <Pressable style={styles.acceptButton} onPress={() => onRespond(b.id, 'confirmed')}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.declineButton} onPress={() => onRespond(b.id, 'declined')}>
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {confirmed.map((b) => (
            <View key={b.id} style={styles.bookingRow}>
              <Text style={styles.bookingName}>{b.rider?.full_name ?? 'Rider'}</Text>
              <StatusBadge status="confirmed" />
            </View>
          ))}
        </>
      )}

      {ride.status === 'scheduled' && (
        <PrimaryButton title="Start trip" onPress={onStart} loading={busy} style={styles.controlButton} />
      )}
      {ride.status === 'in_progress' && (
        <>
          <PrimaryButton
            title={sharingLocation ? 'Stop sharing location' : 'Share my live location'}
            onPress={onToggleSharing}
            variant={sharingLocation ? 'danger' : 'secondary'}
            style={styles.controlButton}
          />
          <PrimaryButton title="Complete trip" onPress={onComplete} loading={busy} style={styles.controlButton} />
        </>
      )}
      {ride.status === 'scheduled' && (
        <PrimaryButton title="Cancel ride" onPress={onCancel} variant="danger" style={styles.controlButton} />
      )}
    </View>
  );
}

function RiderControls({
  ride,
  booking,
  busy,
  onJoin,
  onCancel,
}: {
  ride: Ride;
  booking?: Booking;
  busy: boolean;
  onJoin: () => void;
  onCancel: () => void;
}) {
  if (!booking) {
    return (
      <View style={styles.section}>
        <PrimaryButton
          title={ride.seats_available > 0 ? 'Request to join this ride' : 'Ride is full'}
          onPress={onJoin}
          loading={busy}
          disabled={ride.seats_available === 0 || ride.status !== 'scheduled'}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.bookingRow}>
        <Text style={styles.bookingName}>Your request</Text>
        <StatusBadge status={booking.status} />
      </View>
      {(booking.status === 'pending' || booking.status === 'confirmed') && (
        <PrimaryButton title="Cancel my spot" onPress={onCancel} variant="danger" style={styles.controlButton} />
      )}
    </View>
  );
}

function RatingSection({
  ride,
  bookings,
  isDriver,
  currentUserId,
}: {
  ride: Ride;
  bookings: Booking[];
  isDriver: boolean;
  currentUserId: string;
}) {
  const [submittedFor, setSubmittedFor] = useState<Set<string>>(new Set());

  const targets = isDriver
    ? bookings.filter((b) => b.status === 'completed' || b.status === 'confirmed')
    : [{ id: 'driver', rider_id: ride.driver_id, rider: ride.driver } as unknown as Booking];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Rate your ride</Text>
      {targets.map((t) => (
        <RatingRow
          key={t.id}
          name={t.rider?.full_name ?? (isDriver ? 'Rider' : 'Driver')}
          disabled={submittedFor.has(t.id)}
          onSubmit={async (stars) => {
            await submitRating({
              rideId: ride.id,
              raterId: currentUserId,
              rateeId: isDriver ? t.rider_id : ride.driver_id,
              stars,
            });
            setSubmittedFor((prev) => new Set(prev).add(t.id));
          }}
        />
      ))}
    </View>
  );
}

function RatingRow({
  name,
  disabled,
  onSubmit,
}: {
  name: string;
  disabled: boolean;
  onSubmit: (stars: number) => void;
}) {
  const [stars, setStars] = useState(5);
  const [done, setDone] = useState(disabled);

  return (
    <View style={styles.ratingRow}>
      <Text style={styles.bookingName}>{name}</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => !done && setStars(n)}>
            <Ionicons
              name={n <= stars ? 'star' : 'star-outline'}
              size={22}
              color={colors.scarlet}
              style={styles.star}
            />
          </Pressable>
        ))}
      </View>
      {!done && (
        <Pressable
          style={styles.rateSubmit}
          onPress={() => {
            onSubmit(stars);
            setDone(true);
          }}
        >
          <Text style={styles.rateSubmitText}>Submit</Text>
        </Pressable>
      )}
      {done && <Text style={styles.thanks}>Thanks!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.scarlet,
  },
  route: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  driver: {
    fontSize: fontSizes.sm,
    color: colors.gray800,
  },
  verifiedIcon: {
    marginLeft: spacing.xs,
  },
  emergencyRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  shareLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.scarlet,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  shareLocationText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.scarlet,
    marginLeft: 4,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sosText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.white,
    marginLeft: 4,
  },
  settleNote: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.sm,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  bookingName: {
    fontSize: fontSizes.sm,
    color: colors.black,
    fontWeight: '600',
  },
  bookingActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
  },
  acceptText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  declineButton: {
    backgroundColor: colors.gray200,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  declineText: {
    color: colors.gray800,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  controlButton: {
    marginTop: spacing.sm,
  },
  chatSection: {
    marginTop: spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  messageMine: {
    backgroundColor: colors.scarlet,
    alignSelf: 'flex-end',
  },
  messageTheirs: {
    backgroundColor: colors.gray100,
    alignSelf: 'flex-start',
  },
  messageText: {
    color: colors.black,
    fontSize: fontSizes.sm,
  },
  emptyMessages: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.sm,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    marginBottom: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  star: {
    marginRight: 4,
  },
  rateSubmit: {
    backgroundColor: colors.scarlet,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    width: 100,
  },
  rateSubmitText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSizes.xs,
  },
  thanks: {
    fontSize: fontSizes.xs,
    color: colors.success,
    fontWeight: '700',
  },
});
