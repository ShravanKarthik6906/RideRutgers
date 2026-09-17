import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, fontSizes } from '../constants/theme';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    color: colors.gray600,
    textAlign: 'center',
  },
});
