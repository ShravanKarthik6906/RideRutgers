import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="post-ride"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Post a Ride',
            headerStyle: { backgroundColor: colors.white },
          }}
        />
        <Stack.Screen
          name="driver-verification"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Become a Driver',
            headerStyle: { backgroundColor: colors.white },
          }}
        />
        <Stack.Screen
          name="ride/[id]"
          options={{
            headerShown: true,
            title: 'Ride Details',
            headerStyle: { backgroundColor: colors.white },
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
