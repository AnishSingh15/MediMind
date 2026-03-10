/**
 * MediMind Design System — Material Design 3 inspired
 * Elderly-friendly: large fonts, high contrast, calming colors
 */

export const Colors = {
  // Primary palette — calming blue/teal
  primary: '#1B6B93',
  primaryLight: '#4A9CC7',
  primaryDark: '#0E4D6B',
  primaryContainer: '#D6EFF8',

  // Secondary — warm teal
  secondary: '#2E8B7A',
  secondaryLight: '#5CBFAC',
  secondaryContainer: '#D4F0EB',

  // Surface & Background
  background: '#FAFCFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F5FA',
  cardBackground: '#FFFFFF',

  // Status colors
  success: '#2E7D32',
  successLight: '#E8F5E9',
  successContainer: '#C8E6C9',

  danger: '#C62828',
  dangerLight: '#FFEBEE',
  dangerContainer: '#FFCDD2',

  warning: '#F57F17',
  warningLight: '#FFF9C4',
  warningContainer: '#FFF176',

  // Text
  textPrimary: '#1A1C1E',
  textSecondary: '#44474E',
  textTertiary: '#74777F',
  textOnPrimary: '#FFFFFF',
  textOnSuccess: '#FFFFFF',
  textOnDanger: '#FFFFFF',

  // Borders & Dividers
  border: '#E0E3E8',
  divider: '#E8EAED',

  // Medicine card colors (6 soft options)
  medicineColors: [
    '#4A9CC7', // Soft blue
    '#5CBFAC', // Teal
    '#F06292', // Soft pink
    '#FFB74D', // Warm orange
    '#9575CD', // Soft purple
    '#81C784', // Soft green
  ],
} as const;

export const Typography = {
  // Elderly-friendly sizes — minimum 18sp body
  heading1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: Colors.textPrimary,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  bodyBold: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  button: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: Colors.textOnPrimary,
  },
  caption: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: 20,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Elevation = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  low: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  medium: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  high: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
};

// Minimum touch targets for elderly users (56dp as per PRD)
export const TouchTarget = {
  minSize: 56,
  minHitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Elevation,
  TouchTarget,
};
