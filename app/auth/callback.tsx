import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../../lib/supabase';
import { colors, fontSizes, spacing } from '../../constants/theme';

// Supabase's confirmation email links here with the session tokens attached
// (as a query string or a URL fragment, depending on platform) — expo-auth-session's
// QueryParams helper normalizes both, matching Supabase's own Expo deep-linking guide:
// https://supabase.com/docs/guides/auth/native-mobile-deep-linking
export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode || params.error_description) {
      setError(params.error_description ?? errorCode ?? 'Verification failed.');
      return;
    }
    if (!params.access_token || !params.refresh_token) {
      setError('This link is missing its verification tokens.');
      return;
    }

    supabase.auth
      .setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        router.replace('/');
      });
  }, [url]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.link} onPress={() => router.replace('/(auth)/sign-in')}>
          Back to sign in
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.scarlet} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  link: {
    color: colors.scarlet,
    fontWeight: '600',
  },
});
