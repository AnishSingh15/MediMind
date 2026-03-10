/**
 * MediMind Design System — Material Design 3 inspired
 * Elderly-friendly: large fonts, high contrast, calming colors
 */

export const Colors = {
  // Primary palette — purple accent
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryDark: "#5B21B6",
  primaryContainer: "#EDE9FE",

  // Secondary — pure black
  secondary: "#000000",
  secondaryLight: "#1A1A1A",
  secondaryContainer: "#F0F0F0",

  // Surface & Background — white
  background: "#FFFFFF",
  surface: "#F8F8F8",
  surfaceVariant: "#F0F0F0",
  cardBackground: "#FFFFFF",

  // Status colors
  success: "#16A34A",
  successLight: "#DCFCE7",
  successContainer: "#BBF7D0",

  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  dangerContainer: "#FECACA",

  warning: "#D97706",
  warningLight: "#FEF3C7",
  warningContainer: "#FDE68A",

  // Text
  textPrimary: "#000000",
  textSecondary: "#3F3F3F",
  textTertiary: "#737373",
  textOnPrimary: "#FFFFFF",
  textOnSuccess: "#FFFFFF",
  textOnDanger: "#FFFFFF",

  // Borders & Dividers
  border: "#E5E5E5",
  divider: "#EBEBEB",

  // Medicine card colors — black/white/purple palette
  medicineColors: [
    "#7C3AED", // Purple
    "#000000", // Black
    "#A78BFA", // Light Purple
    "#4B5563", // Dark Grey
    "#5B21B6", // Deep Purple
    "#374151", // Charcoal
  ],
} as const;

export const Typography = {
  // Elderly-friendly sizes — minimum 18sp body
  heading1: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 36,
    color: Colors.textPrimary,
  },
  heading2: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
    color: Colors.textPrimary,
  },
  heading3: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 18,
    fontWeight: "400" as const,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  bodyBold: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 26,
    color: Colors.textPrimary,
  },
  button: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
    color: Colors.textOnPrimary,
  },
  caption: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: "500" as const,
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
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  low: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  medium: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  high: {
    elevation: 8,
    shadowColor: "#000",
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
