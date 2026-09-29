import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { isAllowedStudentEmail } from '../../lib/auth';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, fontSizes, radius } from '../../constants/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!isAllowedStudentEmail(trimmed)) {
      setError('Please use your Rutgers .edu email address (e.g. netid@scarletmail.rutgers.edu).');
      return;
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('/auth/callback') },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { email: trimmed } });
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandR}>RR</Text>
          <Text style={styles.title}>RideRutgers</Text>
          <Text style={styles.subtitle}>Verified peer ridesharing for Rutgers students.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Rutgers email</Text>
          <TextInput
            style={styles.input}
            placeholder="netid@scarletmail.rutgers.edu"
            placeholderTextColor={colors.gray400}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton title="Continue" onPress={handleContinue} loading={loading} style={styles.button} />
        </View>

        <Text style={styles.footnote}>
          We'll email you a one-time code to verify you're a Rutgers student. No password needed.
        </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandR: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.scarlet,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.black,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.gray600,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
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
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.xs,
  },
  footnote: {
    fontSize: fontSizes.xs,
    color: colors.gray400,
    textAlign: 'center',
  },
});
