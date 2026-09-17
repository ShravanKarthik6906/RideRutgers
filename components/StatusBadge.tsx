import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, fontSizes } from '../constants/theme';

const PALETTE: Record<string, { bg: string; fg: string }> = {
  scheduled: { bg: '#E8F0FE', fg: '#1A56DB' },
  in_progress: { bg: '#FEF3E8', fg: colors.warning },
  completed: { bg: '#E7F6EC', fg: colors.success },
  cancelled: { bg: '#FBE9E7', fg: colors.danger },
  pending: { bg: '#FEF3E8', fg: colors.warning },
  confirmed: { bg: '#E7F6EC', fg: colors.success },
  declined: { bg: '#FBE9E7', fg: colors.danger },
  open: { bg: '#E8F0FE', fg: '#1A56DB' },
  matched: { bg: '#E7F6EC', fg: colors.success },
  none: { bg: colors.gray100, fg: colors.gray600 },
  approved: { bg: '#E7F6EC', fg: colors.success },
  rejected: { bg: '#FBE9E7', fg: colors.danger },
};

const LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  confirmed: 'Confirmed',
  declined: 'Declined',
  open: 'Open',
  matched: 'Matched',
  none: 'Not applied',
  approved: 'Verified',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: string }) {
  const palette = PALETTE[status] ?? PALETTE.none;
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
});
