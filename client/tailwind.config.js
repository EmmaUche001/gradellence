/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand primary (blue)
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
        // Neutral grays
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
        // Semantic colors
        success: {
          DEFAULT: '#22C55E',
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          50:  '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          DEFAULT: '#0EA5E9',
          50:  '#F0F9FF',
          100: '#E0F2FE',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
        // Surface tokens
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'surface-alt': '#F1F5F9',
        border: '#E2E8F0',

        // Parent portal surface tokens (warmer)
        'parent-bg':      '#FAFAF8',
        'parent-surface': '#FFFFFF',
        'parent-border':  '#E8EDE8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Design system typography scale
        'display':       ['40px', { lineHeight: '1.2', fontWeight: '700' }],
        'page-title':    ['30px', { lineHeight: '1.25', fontWeight: '700' }],
        'section-title': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title':    ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body':          ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption':       ['12px', { lineHeight: '1.5', fontWeight: '500' }],
      },
      spacing: {
        // Design system spacing scale (4-base)
        1:  '4px',
        2:  '8px',
        3:  '12px',
        4:  '16px',
        5:  '20px',
        6:  '24px',
        8:  '32px',
        10: '40px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        // Design system border radius
        'btn':    '10px',
        'input':  '10px',
        'card':   '18px',
        'modal':  '20px',
        'avatar': '9999px',
        // Keep standard aliases too
        'none': '0',
        'sm':   '4px',
        'md':   '6px',
        'lg':   '10px',
        'xl':   '12px',
        '2xl':  '18px',
        '3xl':  '20px',
        'full': '9999px',
      },
      boxShadow: {
        // Design system shadows (soft, no heavy shadows)
        'sm':  '0 1px 3px rgba(0,0,0,0.08)',
        'md':  '0 8px 20px rgba(0,0,0,0.08)',
        'lg':  '0 20px 45px rgba(0,0,0,0.12)',
        // Overwrite defaults too
        'DEFAULT': '0 1px 3px rgba(0,0,0,0.08)',
        'none': 'none',
      },
      maxWidth: {
        'container': '1440px',
      },
      width: {
        'sidebar':           '280px',
        'sidebar-collapsed': '88px',
      },
      height: {
        'topnav': '72px',
        'input':  '48px',
        'btn':    '48px',
        'icon-btn': '40px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        '200': '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0,0,0.2,1)', // ease-out
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        // Page transition — content fades up on route change
        'page-enter': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Modal spring — panel scales from slightly small
        'modal-spring': {
          '0%':   { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
          '60%':  { opacity: '1', transform: 'scale(1.01) translateY(-1px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        // Backdrop fade in
        'backdrop-in': {
          '0%':   { opacity: '0', backdropFilter: 'blur(0px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(4px)' },
        },
        // Button press — subtle scale down
        'btn-press': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        // Row stagger entry
        'row-enter': {
          '0%':   { opacity: '0', transform: 'translateX(-6px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Scale in — for success indicators, icons
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // KPI count-up shimmer sweep
        'shimmer-sweep': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Float for empty state icons
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        // Shake for destructive confirmations
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-5px)' },
          '40%':      { transform: 'translateX(5px)' },
          '60%':      { transform: 'translateX(-3px)' },
          '80%':      { transform: 'translateX(3px)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 150ms ease-out',
        'slide-in':      'slide-in 150ms ease-out',
        'skeleton-pulse':'skeleton-pulse 1.5s ease-in-out infinite',
        'page-enter':    'page-enter 220ms cubic-bezier(0,0,0.2,1)',
        'modal-spring':  'modal-spring 300ms cubic-bezier(0.34,1.56,0.64,1)',
        'backdrop-in':   'backdrop-in 200ms ease-out',
        'btn-press':     'btn-press 120ms ease-out',
        'row-enter':     'row-enter 180ms ease-out both',
        'float':         'float 3s ease-in-out infinite',
        'shake':         'shake 400ms ease-in-out',
        'scale-in':      'scale-in 150ms ease-out',
      },
    },
  },
  plugins: [
    function ({ addUtilities, e }) {
      // Disable all animations under prefers-reduced-motion
      addUtilities({
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            'animation-duration': '0.01ms !important',
            'animation-iteration-count': '1 !important',
            'transition-duration': '0.01ms !important',
          },
        },
      });
    },
  ],
};
