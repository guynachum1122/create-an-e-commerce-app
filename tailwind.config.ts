import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        brand: {
          terracotta: { DEFAULT: '#C45A3B', hover: '#A84A30', muted: '#F5E8E4' },
          sage: { DEFAULT: '#5C7A6B', hover: '#4A6357', muted: '#E8F0EC' },
          honey: { DEFAULT: '#E8A838', muted: '#FDF4E3' },
          charcoal: '#2B2B2B',
          cream: '#FAF7F2',
        },
        success: { DEFAULT: '#2D8A5E', muted: '#E6F5ED' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'display-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      spacing: {
        header: '4rem',
        'header-mobile': '3.5rem',
        'section-y': '4rem',
        'section-y-sm': '2.5rem',
        gutter: '1rem',
        'gutter-lg': '2rem',
      },
      maxWidth: { content: '80rem', narrow: '42rem' },
      boxShadow: {
        card: '0 1px 3px rgba(43,43,43,0.08), 0 4px 12px rgba(43,43,43,0.04)',
        'card-hover': '0 4px 16px rgba(43,43,43,0.12)',
        drawer: '0 0 24px rgba(0,0,0,0.15)',
        dropdown: '0 4px 16px rgba(43,43,43,0.12)',
      },
      zIndex: { header: '50', drawer: '60', modal: '70', toast: '80', 'cookie-banner': '90' },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
