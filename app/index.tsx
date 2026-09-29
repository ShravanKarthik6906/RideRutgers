import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { colors } from '../constants/theme';

export default function Index() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.scarlet} size="large" />
      </SafeAreaView>
    );
  }

  return <Redirect href={session ? '/(tabs)/board' : '/(auth)/sign-in'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
