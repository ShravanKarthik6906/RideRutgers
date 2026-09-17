import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { colors } from '../constants/theme';

export default function Index() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.scarlet} size="large" />
      </View>
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
