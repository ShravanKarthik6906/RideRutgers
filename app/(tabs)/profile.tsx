import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { StatusBadge } from '../../components/StatusBadge';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';

export default function Profile() {
  const { profile, session, signOut } = useAuth();

  if (!profile) return null;

  const initials = (profile.full_name ?? profile.email)
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.name}>{profile.full_name}</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Text style={styles.rating}>
        ★ {profile.rating_avg.toFixed(1)} · {profile.rating_count} ride{profile.rating_count === 1 ? '' : 's'} rated
      </Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Driver verification</Text>
          <StatusBadge status={profile.is_driver_verified ? 'approved' : profile.driver_verification_status} />
        </View>
        {!profile.is_driver_verified && (
          <PrimaryButton
            title={profile.driver_verification_status === 'pending' ? 'Application pending' : 'Become a verified driver'}
            onPress={() => router.push('/driver-verification')}
            disabled={profile.driver_verification_status === 'pending'}
            variant="secondary"
            style={styles.cardButton}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Phone</Text>
        <Text style={styles.cardValue}>{profile.phone || 'Not set'}</Text>
      </View>

      <PrimaryButton title="Sign out" onPress={signOut} variant="danger" style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  content: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    color: colors.black,
  },
  email: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
    marginTop: 2,
  },
  rating: {
    fontSize: fontSizes.sm,
    color: colors.gray800,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
  },
  cardValue: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
    marginTop: 4,
  },
  cardButton: {
    marginTop: spacing.sm,
  },
  signOut: {
    width: '100%',
    marginTop: spacing.md,
  },
});
