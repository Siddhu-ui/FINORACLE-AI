/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        'background-secondary': 'var(--bg-secondary)',
        card: 'var(--card)',
        'card-hover': 'var(--card-hover)',
        'card-border': 'var(--card-border)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-light': 'var(--primary-light)',
        'primary-lighter': 'var(--primary-lighter)',
        'primary-muted': 'var(--primary-muted)',
        accent: 'var(--primary)',
        highlight: 'var(--primary-lighter)',
        secondary: 'var(--text-secondary)',
        positive: 'var(--positive)',
        'positive-muted': 'var(--positive-muted)',
        negative: 'var(--negative)',
        'negative-muted': 'var(--negative-muted)',
        warning: 'var(--warning)',
        'warning-muted': 'var(--warning-muted)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-dim': 'var(--text-dim)',
        border: 'var(--border)',
        'border-hover': 'var(--border-hover)',
        surface: 'var(--surface)',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(21, 155, 114, 0.08)',
        'glow-lg': '0 0 32px rgba(21, 155, 114, 0.1)',
        card: '0 12px 32px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 18px 36px rgba(15, 23, 42, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
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
        shimmer: 'linear-gradient(90deg, transparent 0%, rgba(21, 155, 114, 0.08) 50%, transparent 100%)',
      },
      backgroundSize: {
        shimmer: '200% 100%',
      },
    },
  },
  plugins: [],
};
