import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, fontSizes, spacing } from '../../constants/theme';

// Supabase's confirmation email links here with the session tokens in the URL
// fragment (implicit flow), e.g. riderutgers://auth/callback#access_token=...
// &refresh_token=...&type=signup. Fragments aren't parsed into Linking's
// queryParams, so we pull them out of the raw URL ourselves.
export default function AuthCallback() {
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const hash = url.split('#')[1];
    const params = new URLSearchParams(hash ?? '');
    const errorDescription = params.get('error_description');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (errorDescription) {
      setError(errorDescription);
      return;
    }
    if (!accessToken || !refreshToken) {
      setError('This link is missing its verification tokens.');
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
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
