import { colors, spacing, radii, typography } from '@orbit/ui';
import { DefaultTheme, Theme } from '@react-navigation/native';

export const orbitNavTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.neutral.cloud,
    text: colors.neutral.ink,
    border: colors.neutral.mist,
    card: '#ffffff',
    notification: colors.secondary,
  },
};

export const orbitStyles = {
  screenPadding: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neutral.mist,
    shadowColor: colors.neutral.ink,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: typography.sizes.heading[0],
    fontWeight: '700' as const,
    color: colors.neutral.ink,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.neutral.ash,
  },
  sectionSpacing: {
    marginTop: spacing.xxl,
  },
  pill: {
    backgroundColor: 'rgba(91, 108, 251, 0.12)',
    color: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontWeight: '600' as const,
  },
};
