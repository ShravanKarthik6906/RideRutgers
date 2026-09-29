import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { createRide, createRideRequest, findMatchingRides } from '../lib/api';
import { distanceInMiles, estimateGasCostSplit, formatCurrency, formatMiles } from '../lib/pricing';
import { ASSUMED_MPG, PRICE_PER_GALLON } from '../constants/pricing';
import { MapPicker, type PickedLocation } from '../components/MapPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { RideCard } from '../components/RideCard';
import { colors, spacing, fontSizes, radius } from '../constants/theme';
import type { Ride } from '../lib/types';

type Mode = 'offer' | 'request';

export default function PostRide() {
  const { session, profile, refreshProfile } = useAuth();
  const canOffer = !!profile?.is_driver_verified;
  const [mode, setMode] = useState<Mode>(canOffer ? 'offer' : 'request');
  const [origin, setOrigin] = useState<PickedLocation | null>(null);
  const [destination, setDestination] = useState<PickedLocation | null>(null);
  const [departureTime, setDepartureTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [seats, setSeats] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request mode is search-first: a request only ever matches against trips
  // drivers already posted, never a public invitation for a driver to invent
  // one. `matches` is null until searched; [] means "searched, found none."
  const [matches, setMatches] = useState<Ride[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMatches(null);
    setSaved(false);
  }, [origin, destination, departureTime, mode]);

  const estimate = useMemo(() => {
    if (!origin || !destination) return null;
    const miles = distanceInMiles(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    return estimateGasCostSplit(miles, seats + 1);
  }, [origin, destination, seats]);

  const handleFindMatches = async () => {
    if (!origin || !destination) {
      setError('Set both a pickup and drop-off location.');
      return;
    }
    setError(null);
    setSearching(true);
    try {
      const found = await findMatchingRides(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        departureTime.toISOString()
      );
      setMatches(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!session || !origin || !destination) return;
    setError(null);
    setLoading(true);
    try {
      await createRideRequest({
        riderId: session.user.id,
        originLabel: origin.label,
        originLat: origin.latitude,
        originLng: origin.longitude,
        destinationLabel: destination.label,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        requestedTime: departureTime.toISOString(),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostRide = async () => {
    if (!session) return;
    if (!origin || !destination) {
      setError('Set both a pickup and drop-off location.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await refreshProfile();
      if (!canOffer) {
        setError('You need to be a verified driver to post a ride offer.');
        setLoading(false);
        return;
      }
      await createRide({
        driverId: session.user.id,
        originLabel: origin.label,
        originLat: origin.latitude,
        originLng: origin.longitude,
        destinationLabel: destination.label,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
        departureTime: departureTime.toISOString(),
        seatsTotal: seats,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.segmented}>
        <SegmentButton
          label="Offer a ride"
          active={mode === 'offer'}
          onPress={() => setMode('offer')}
          disabled={!canOffer}
        />
        <SegmentButton label="Find a ride" active={mode === 'request'} onPress={() => setMode('request')} />
      </View>
      {mode === 'offer' && !canOffer && (
        <Text style={styles.notice}>
          You'll need to become a verified driver before you can post ride offers. You can still look for a ride
          below.
        </Text>
      )}
      {mode === 'request' && (
        <Text style={styles.notice}>
          We'll check for trips drivers have already posted on this route and time. If nothing matches yet, you can
          save this and we'll keep watching — drivers never see unmatched requests.
        </Text>
      )}

      <MapPicker label="Pickup location" value={origin} onChange={setOrigin} />
      <MapPicker label="Drop-off location" value={destination} onChange={setDestination} />

      <Text style={styles.label}>{mode === 'offer' ? 'Departure time' : 'When you need to leave'}</Text>
      <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateButtonText}>
          {departureTime.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={departureTime}
          mode="datetime"
          minimumDate={new Date()}
          onChange={(_event, date) => {
            setShowPicker(Platform.OS === 'ios');
            if (date) setDepartureTime(date);
          }}
        />
      )}

      {mode === 'offer' && (
        <>
          <Text style={styles.label}>Seats available</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setSeats((s) => Math.max(1, s - 1))}
            >
              <Text style={styles.stepperText}>–</Text>
            </Pressable>
            <Text style={styles.stepperValue}>{seats}</Text>
            <Pressable style={styles.stepperButton} onPress={() => setSeats((s) => Math.min(6, s + 1))}>
              <Text style={styles.stepperText}>+</Text>
            </Pressable>
          </View>
        </>
      )}

      {mode === 'offer' && estimate && (
        <View style={styles.estimateCard}>
          <Text style={styles.estimateLabel}>Estimated gas cost split</Text>
          <Text style={styles.estimateValue}>{formatCurrency(estimate.costPerPerson)} / person</Text>
          <Text style={styles.estimateBreakdown}>
            {formatMiles(estimate.distanceMiles)} · {formatCurrency(estimate.totalGasCost)} total gas ÷{' '}
            {estimate.occupants} people (you + {seats} rider{seats === 1 ? '' : 's'}) · assumes {ASSUMED_MPG} mpg at $
            {PRICE_PER_GALLON.toFixed(2)}/gal
          </Text>
          <Text style={styles.settleNote}>
            This is a gas cost estimate, not an in-app charge — riders and drivers settle up directly (Venmo, Zelle,
            cash, etc.).
          </Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === 'offer' ? (
        <PrimaryButton title="Post ride offer" onPress={handlePostRide} loading={loading} style={styles.submit} />
      ) : matches === null ? (
        <PrimaryButton
          title="Search for a matching ride"
          onPress={handleFindMatches}
          loading={searching}
          style={styles.submit}
        />
      ) : matches.length > 0 ? (
        <View style={styles.matchesSection}>
          <Text style={styles.matchesTitle}>
            {matches.length} matching trip{matches.length === 1 ? '' : 's'} already posted
          </Text>
          {matches.map((ride) => (
            <RideCard key={ride.id} ride={ride} onPress={() => router.push(`/ride/${ride.id}`)} />
          ))}
        </View>
      ) : saved ? (
        <Text style={styles.savedText}>Saved — we'll keep watching for a matching trip.</Text>
      ) : (
        <View>
          <Text style={styles.notice}>No matching trips are posted yet.</Text>
          <PrimaryButton
            title="Save request & get notified"
            onPress={handleSaveRequest}
            loading={loading}
            variant="secondary"
            style={styles.submit}
          />
        </View>
      )}
    </ScrollView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.segmentButton, active && styles.segmentButtonActive, disabled && styles.segmentDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
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
  segmentDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray600,
  },
  segmentTextActive: {
    color: colors.scarlet,
  },
  notice: {
    fontSize: fontSizes.xs,
    color: colors.warning,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.xs,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  dateButtonText: {
    fontSize: fontSizes.md,
    color: colors.black,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.black,
  },
  stepperValue: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.black,
    width: 48,
    textAlign: 'center',
  },
  estimateCard: {
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  estimateLabel: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
  },
  estimateValue: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.scarlet,
    marginTop: 2,
  },
  estimateBreakdown: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    marginTop: 2,
  },
  settleNote: {
    fontSize: fontSizes.xs,
    color: colors.gray600,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    marginBottom: spacing.sm,
  },
  submit: {
    marginTop: spacing.sm,
  },
  matchesSection: {
    marginTop: spacing.sm,
  },
  matchesTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.sm,
  },
  savedText: {
    fontSize: fontSizes.sm,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
