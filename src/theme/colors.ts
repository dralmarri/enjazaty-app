/**
 * Enjazaty (إنجازاتي) color palette.
 * Luxurious saffron yellow primary with clean white backgrounds and
 * deep navy/charcoal text — designed for an administrative productivity app.
 */
export const colors = {
  /** Primary saffron yellow — main buttons, highlights */
  primary: '#F4B000',
  /** Darker saffron — pressed states, gradients, accents */
  primaryDark: '#D99A00',
  /** Pure white — primary background */
  background: '#FFFFFF',
  /** Soft saffron tint — cards, secondary surfaces, gradients */
  softBackground: '#FFF8E6',
  /** Deep navy / soft black — primary text */
  textDark: '#1F2937',
  /** Muted gray — secondary text, captions */
  mutedText: '#6B7280',
  /** Subtle saffron border */
  border: '#F3E2B3',
  /** Success green */
  success: '#16A34A',
  /** Danger red */
  danger: '#DC2626',
  /** Text shown on top of the primary saffron buttons */
  onPrimary: '#FFFFFF',
  /** Pure white, used on cards */
  white: '#FFFFFF',
} as const;

/** Light saffron -> white gradient used on hero/header surfaces. */
export const primaryGradient = ['#F4B000', '#FFC93C'] as const;
export const softGradient = ['#FFF8E6', '#FFFFFF'] as const;

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
