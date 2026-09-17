import React from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuth } from '../../lib/auth';

export default function AuthLayout() {
  const { session, profile, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;

  if (session && profile?.full_name) {
    return <Redirect href="/(tabs)/board" />;
  }

  if (session && !profile?.full_name && pathname !== '/onboarding') {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
