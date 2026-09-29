import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile?.full_name) return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.scarlet,
        tabBarInactiveTintColor: colors.gray400,
      }}
    >
      <Tabs.Screen
        name="board"
        options={{
          title: 'Ride Board',
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
