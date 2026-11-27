/** @type {import('tailwindcss').Config} */
const rgbVar = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens (Light: Groww/Angel One white + emerald, Dark: HUD near-black + emerald glow)
        // Values live in src/styles/globals.css as space-separated RGB channels so opacity modifiers work.
        'primary-bg': rgbVar('bg'),
        'card-bg': rgbVar('card'),
        'surface-subtle': rgbVar('bg-secondary'),
        background: rgbVar('bg'),
        'background-secondary': rgbVar('bg-secondary'),
        card: rgbVar('card'),
        'card-hover': rgbVar('card-hover'),
        'card-border': rgbVar('card-border'),
        primary: rgbVar('primary'),
        'primary-hover': rgbVar('primary-hover'),
        'primary-light': rgbVar('primary'),
        'primary-lighter': rgbVar('primary-lighter'),
        'primary-muted': 'var(--primary-muted)',
        'action-primary': rgbVar('primary'),
        'action-primary-hover': rgbVar('primary-hover'),
        secondary: rgbVar('secondary'),
        accent: rgbVar('primary'),
        highlight: rgbVar('primary-hover'),
        positive: rgbVar('positive'),
        'positive-muted': 'var(--positive-muted)',
        negative: rgbVar('negative'),
        'negative-muted': 'var(--negative-muted)',
        warning: rgbVar('warning'),
        'warning-muted': 'var(--warning-muted)',
        'text-primary': rgbVar('text-primary'),
        'text-secondary': rgbVar('text-secondary'),
        'text-muted': rgbVar('text-muted'),
        'text-dim': rgbVar('text-dim'),
        border: rgbVar('card-border'),
        'border-hover': rgbVar('primary'),
      },      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 4px 16px rgba(21, 155, 114, 0.08)',
        'glow-lg': '0 8px 24px rgba(21, 155, 114, 0.10)',
        card: '0 2px 12px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'slide-left': 'slideLeft 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        shimmer: 'linear-gradient(90deg, var(--skel-a) 0%, var(--skel-b) 50%, var(--skel-a) 100%)',
      },
      backgroundSize: {
        shimmer: '200% 100%',
      },
    },
  },
  plugins: [],
};
