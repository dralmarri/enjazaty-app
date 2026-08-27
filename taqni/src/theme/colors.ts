/**
 * تقني (Taqni) color palette.
 * Medium/light Indigo primary — reserve the heavier, darker indigo for the
 * Header and other high-emphasis chrome only.
 */
export const colors = {
  /** Primary indigo — main buttons, highlights, active tab */
  primary: '#5B5FC7',
  /** Darker indigo — Header background, pressed states, gradients */
  primaryDark: '#4649A3',
  /** Pure white — primary background */
  background: '#FFFFFF',
  /** Soft indigo tint — cards, secondary surfaces */
  softBackground: '#EEF0FC',
  /** Deep navy / soft black — primary text */
  textDark: '#1F2937',
  /** Muted gray — secondary text, captions */
  mutedText: '#6B7280',
  /** Subtle indigo border */
  border: '#DBDDF5',
  /** Success green */
  success: '#16A34A',
  /** Danger red (status/errors only — never a button, per house rule) */
  danger: '#DC2626',
  /** Text shown on top of the primary indigo buttons */
  onPrimary: '#FFFFFF',
  /** Pure white, used on cards */
  white: '#FFFFFF',
} as const;

/** Light indigo -> white gradient used on hero/header surfaces. */
export const primaryGradient = ['#6366D1', '#8689E0'] as const;
export const softGradient = ['#EEF0FC', '#FFFFFF'] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Cross-platform soft shadow helper. */
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
} as const;
