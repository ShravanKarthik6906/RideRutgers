import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { updateProfile } from '../../lib/api';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';

export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!session) return;
    setError(null);
    if (fullName.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    setLoading(true);
    try {
      await updateProfile(session.user.id, { full_name: fullName.trim(), phone: phone.trim() || null });
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Welcome to RideRutgers</Text>
      <Text style={styles.subtitle}>Let's set up your profile.</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        placeholder="Naren Natarajan"
        placeholderTextColor={colors.gray400}
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Phone number (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="(732) 555-0100"
        placeholderTextColor={colors.gray400}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton title="Get started" onPress={handleSave} loading={loading} style={styles.button} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.black,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.black,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.sm,
  },
});
