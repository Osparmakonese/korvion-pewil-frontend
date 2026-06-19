// Mobile design tokens — the shared language for the native-feel mobile UI.
// Import these instead of hardcoding values so every mobile screen feels like
// one app. Brand colors mirror the existing design system.

export const M = {
  // Brand (from the desktop design system)
  green: '#1a6b3a',
  green2: '#2d9e58',
  green3: '#e8f5ee',
  amber: '#c97d1a',
  red: '#c0392b',
  ink: '#111827',
  ink2: '#374151',
  ink3: '#6b7280',
  line: '#e5e7eb',
  surface: '#f9fafb',
  card: '#ffffff',

  // Spacing scale (8pt-based, phone-tuned)
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },

  // Corner radii — generous, iOS/Material-modern
  radius: { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 },

  // Type scale (mobile-first; 16px min on inputs to stop iOS zoom)
  font: {
    display: 28, h1: 22, h2: 18, body: 15, small: 13, micro: 11,
    input: 16, // never below 16 on focusable inputs
  },

  // Touch — never below 44x44 (Apple HIG) / 48 (Material) for primary actions
  touch: { min: 44, comfortable: 52, fab: 60 },

  // Motion — short, snappy, native
  motion: {
    fast: '140ms cubic-bezier(0.2, 0, 0, 1)',
    base: '220ms cubic-bezier(0.2, 0, 0, 1)',
    sheet: '300ms cubic-bezier(0.32, 0.72, 0, 1)', // iOS sheet spring-ish
  },

  // Elevation
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.06)',
    raised: '0 6px 20px rgba(0,0,0,0.12)',
    sheet: '0 -8px 40px rgba(0,0,0,0.18)',
    fab: '0 8px 24px rgba(26,107,58,0.35)',
  },

  // Layout
  z: { header: 600, bottomNav: 500, sheet: 1000, toast: 1100, fab: 450 },
  headerH: 54,
  bottomNavH: 76,

  // Safe-area insets (use in template strings)
  safeTop: 'env(safe-area-inset-top, 0px)',
  safeBottom: 'env(safe-area-inset-bottom, 0px)',
};

// The vertical space a fixed bottom bar should leave clear above the home
// indicator + bottom nav. Use as paddingBottom on scroll containers.
export const BOTTOM_CLEARANCE = `calc(${M.bottomNavH}px + ${M.safeBottom} + 12px)`;

export default M;
