export const colors = {
  background: '#FCFBF8',
  surface: '#FFFFFF',
  surfaceSoft: '#F6F2ED',
  border: '#E7DED2',
  textPrimary: '#2B211B',
  textSecondary: '#6F6258',
  accentRed: '#7B1E2B',
  accentYellow: '#D9A441',
  accentRose: '#D88AA0',
  successSoft: '#EAF4EA',
  dangerSoft: '#FBECEE',
  successText: '#2F6B3B',
  dangerText: '#9F2D2D',
} as const;

export type ColorName = keyof typeof colors;
