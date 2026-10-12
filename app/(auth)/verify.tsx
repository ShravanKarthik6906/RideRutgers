import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
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

  // Entering the emailed code signs in without any deep-link redirect. Once the
  // session exists, the (auth) layout redirects to onboarding or the tabs.
  const handleVerifyCode = async () => {
    setError(null);
    const token = code.replace(/\s/g, '');
    if (!token) {
      setError('Enter the code from your email.');
      return;
    }
    setVerifying(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setVerifying(false);
    if (verifyError) {
      setError(verifyError.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.subtitle}>
        We sent a sign-in email to {email}. Enter the code from it below, or tap the link in the email on this
        device.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Code from your email"
        placeholderTextColor={colors.gray400}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
        onSubmitEditing={handleVerifyCode}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resent ? <Text style={styles.success}>Email resent.</Text> : null}

      <PrimaryButton title="Verify code" onPress={handleVerifyCode} loading={verifying} style={styles.button} />
      <PrimaryButton
        title="Resend email"
        onPress={handleResend}
        loading={loading}
        variant="secondary"
        style={styles.button}
      />
      <Text style={styles.link} onPress={() => router.back()}>
        Use a different email
      </Text>
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
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.lg,
    color: colors.black,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: spacing.sm,
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
