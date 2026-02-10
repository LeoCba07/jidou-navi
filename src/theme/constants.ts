// Design system constants for JidouNavi
// "Modern functionality with retro-pixel accents"

export const COLORS = {
  // Brand colors
  primary: '#FF4B4B',
  primaryDark: '#CC3C3C',
  secondary: '#3C91E6',
  secondaryDark: '#2A6BB0',

  // Backgrounds
  background: '#FDF3E7',
  backgroundDark: '#E8DDD1',
  surface: '#FFFFFF',

  // Text
  text: '#2B2B2B',
  textMuted: '#666666',
  textLight: '#999999',

  // Borders
  borderLight: 'rgba(0, 0, 0, 0.15)',

  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  indigo: '#6366F1',

  // Badge rarity colors
  badgeCommon: '#9CA3AF',
  badgeRare: '#3B82F6',
  badgeEpic: '#8B5CF6',
  badgeLegendary: '#F59E0B',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BORDER_RADIUS = {
  pixel: 2, // Retro pixel style for buttons/cards
  sm: 4,
  md: 8,
  lg: 12, // For inputs
  round: 9999,
} as const;

export const SHADOWS = {
  // Retro pixel shadow - hard edge
  pixel: {
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 2,
  },
  // Larger pixel shadow
  pixelLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  // Soft shadow for inputs
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Medium shadow for cards
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;

export const FONTS = {
  heading: 'PressStart2P', // Retro pixel font for branding
  title: 'DotGothic16', // Page titles
  button: 'Silkscreen', // Buttons and UI elements
  body: 'Inter', // Body text
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
} as const;

// Category colors for filter chips
export const CATEGORY_COLORS = {
  eats: '#FF4B4B',
  gachapon: '#FFB7CE',
  weird: '#9B59B6',
  retro: '#FFD966',
  'local-gems': '#2ECC71',
} as const;

export const VERIFICATION_THRESHOLD = 2;
export const MODAL_SEQUENCE_DELAY_MS = 500;