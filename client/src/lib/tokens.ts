/**
 * Gradellence Design System — v1.0
 * Design tokens as JS constants (mirrors tailwind.config.js)
 * Use these when you need values outside of Tailwind classes,
 * e.g. for Recharts colors, inline styles, or dynamic logic.
 */

// ── Colors ──────────────────────────────────────────────────────────
export const colors = {
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB', // Brand primary
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  gray: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
  info:    '#0EA5E9',

  background:  '#F8FAFC',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F1F5F9',
  border:      '#E2E8F0',
} as const;

// ── Chart palette ────────────────────────────────────────────────────
// Design system: use only Gradellence colors, no rainbow charts
export const chartColors = {
  primary:   colors.primary[600],    // Blue
  secondary: '#8B5CF6',              // Purple
  success:   colors.success,         // Green
  warning:   colors.warning,         // Orange
  danger:    colors.danger,          // Red
} as const;

export const chartColorArray = Object.values(chartColors);

// ── Typography ───────────────────────────────────────────────────────
export const typography = {
  display:      { fontSize: 40, fontWeight: 700 },
  pageTitle:    { fontSize: 30, fontWeight: 700 },
  sectionTitle: { fontSize: 24, fontWeight: 600 },
  cardTitle:    { fontSize: 18, fontWeight: 600 },
  body:         { fontSize: 14, fontWeight: 400 },
  caption:      { fontSize: 12, fontWeight: 500 },
} as const;

// ── Spacing ──────────────────────────────────────────────────────────
export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// ── Border radius ────────────────────────────────────────────────────
export const radius = {
  btn:    '10px',
  input:  '10px',
  card:   '18px',
  modal:  '20px',
  avatar: '9999px',
} as const;

// ── Shadows ──────────────────────────────────────────────────────────
export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 8px 20px rgba(0,0,0,0.08)',
  lg: '0 20px 45px rgba(0,0,0,0.12)',
} as const;

// ── Layout ───────────────────────────────────────────────────────────
export const layout = {
  containerMaxWidth: '1440px',
  sidebarWidth:      '280px',
  sidebarCollapsed:  '88px',
  topNavHeight:      '72px',
} as const;

// ── Animation ────────────────────────────────────────────────────────
export const motion = {
  durationFast:   '150ms',
  durationNormal: '200ms',
  easing:         'cubic-bezier(0,0,0.2,1)',
} as const;
