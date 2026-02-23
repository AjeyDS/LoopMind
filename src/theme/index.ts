// ─── Color palette ─────────────────────────────────────────────────────
export const Colors = {
    // Background
    background: '#F8F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Brand
    primary: '#6C63FF',
    primaryLight: '#EAE8FF',
    primaryDark: '#4B44CC',

    // Text
    textPrimary: '#1A1A2E',
    textSecondary: '#6B6B8A',
    textTertiary: '#A0A0B8',
    textOnDark: '#FFFFFF',
    textOnPrimary: '#FFFFFF',

    // Semantic
    success: '#26de81',
    successLight: '#E8FBF2',
    error: '#FF4757',
    errorLight: '#FFF0F1',
    warning: '#F7B731',
    warningLight: '#FFFBEE',

    // Borders & Dividers
    border: '#EBEBF0',
    borderLight: '#F4F4F8',

    // Cards
    cardShadow: 'rgba(26, 26, 46, 0.12)',

    // Overlay
    overlay: 'rgba(26, 26, 46, 0.5)',
    overlayLight: 'rgba(255, 255, 255, 0.85)',
} as const;

// ─── Typography ────────────────────────────────────────────────────────
export const Typography = {
    // Font weights
    weightRegular: '400' as const,
    weightMedium: '500' as const,
    weightSemibold: '600' as const,
    weightBold: '700' as const,
    weightExtrabold: '800' as const,

    // Font sizes
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
} as const;

// ─── Border radius ─────────────────────────────────────────────────────
export const Radius = {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    '2xl': 32,
    full: 9999,
} as const;

// ─── Shadows ───────────────────────────────────────────────────────────
export const Shadow = {
    sm: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 5,
    },
    lg: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
} as const;

// ─── Animation durations ───────────────────────────────────────────────
export const Duration = {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
} as const;
