import { Platform } from 'react-native';
import { colors } from './colors';

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 18,
  full: 24,
} as const;

export const iconSize = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 24,
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  }),
} as const;

export const typography = {
  titleSerif: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    lineHeight: 34,
    color: colors.textPrimary,
  } as const,
  titleSerifSmall: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
  } as const,
  body: {
    fontFamily: undefined,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  } as const,
  bodySmall: {
    fontFamily: undefined,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  } as const,
  caption: {
    fontFamily: undefined,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    letterSpacing: 0.4,
  } as const,
  label: {
    fontFamily: undefined,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  } as const,
} as const;
