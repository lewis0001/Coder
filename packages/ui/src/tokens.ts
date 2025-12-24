export const colors = {
  primary: '#5B6CFB',
  secondary: '#FF7D64',
  neutral: {
    ink: '#0F172A',
    slate: '#1F2937',
    ash: '#4B5563',
    fog: '#9CA3AF',
    mist: '#E5E7EB',
    cloud: '#F8FAFC',
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#38BDF8',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  mega: 48,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', system-ui, sans-serif',
  sizes: {
    display: [32, 40, 48] as const,
    heading: [24, 28] as const,
    title: 20,
    body: 16,
    caption: 14,
  },
  weights: {
    regular: 400,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const shadows = {
  card: '0 10px 30px -15px rgba(15, 23, 42, 0.18)',
  popover: '0 20px 45px -20px rgba(15, 23, 42, 0.28)',
};

export const components = {
  card: {
    background: colors.neutral.cloud,
    border: `1px solid ${colors.neutral.mist}`,
    radius: radii.md,
    padding: { x: spacing.xl, y: spacing.lg },
    shadow: shadows.card,
  },
  button: {
    height: 48,
    radius: radii.md,
    fontWeight: typography.weights.bold,
    variants: {
      primary: {
        background: colors.primary,
        color: colors.neutral.cloud,
      },
      secondary: {
        background: colors.neutral.cloud,
        color: colors.neutral.ink,
        border: `1px solid rgba(15, 23, 42, 0.12)`,
      },
    },
  },
  tab: {
    height: 58,
    indicatorColor: colors.primary,
    labelSize: typography.sizes.caption,
    radius: radii.sm,
  },
  chip: {
    paddingX: spacing.lg,
    paddingY: spacing.sm,
    radius: radii.pill,
    textSize: typography.sizes.caption,
    selected: {
      background: 'rgba(91, 108, 251, 0.12)',
      color: colors.primary,
    },
    unselected: {
      background: colors.neutral.cloud,
      color: colors.neutral.ash,
      border: `1px solid ${colors.neutral.mist}`,
    },
  },
};

export const orbitTheme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  components,
};

export type OrbitTheme = typeof orbitTheme;
