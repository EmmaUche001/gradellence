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
      },
      animation: {
        'fade-in':       'fade-in 150ms ease-out',
        'slide-in':      'slide-in 150ms ease-out',
        'skeleton-pulse':'skeleton-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
