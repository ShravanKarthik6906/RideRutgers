import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, fontSizes } from '../../constants/theme';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setError(null);
    setResent(false);
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('/auth/callback') },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setResent(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.subtitle}>
        We sent a confirmation link to {email}. Tap it on this device to finish signing in.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resent ? <Text style={styles.success}>Email resent.</Text> : null}

      <PrimaryButton title="Resend email" onPress={handleResend} loading={loading} style={styles.button} />
      <Text style={styles.link} onPress={() => router.back()}>
        Use a different email
      </Text>
    </View>
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
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  success: {
    color: colors.gray600,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.sm,
  },
  link: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: colors.scarlet,
    fontWeight: '600',
  },
});
