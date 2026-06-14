/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#FAF5EF',
        ink: '#2D2A24',
        'ink-soft': '#5B564E',
        paper: '#FFFDF9',
        'paper-line': '#EBE4D7',
        style: {
          jazz: '#2563EB',
          rock: '#DC2626',
          classical: '#D97706',
          electronic: '#9333EA',
          funk: '#EA580C',
          folk: '#16A34A',
          soul: '#DB2777',
        },
        channel: {
          store: '#2563EB',
          online: '#0891B2',
          used: '#EA580C',
        },
      },
      boxShadow: {
        card: '0 2px 8px rgba(45, 42, 36, 0.06), 0 1px 2px rgba(45, 42, 36, 0.04)',
        'card-hover':
          '0 12px 28px rgba(45, 42, 36, 0.12), 0 4px 10px rgba(45, 42, 36, 0.08)',
        panel: '-8px 0 28px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        card: '12px',
      },
      keyframes: {
        'soft-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'soft-bounce': 'soft-bounce 1.6s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 300ms ease-in-out both',
        'fade-in': 'fade-in 300ms ease-in-out both',
      },
      transitionTimingFunction: {
        vinyl: 'ease-in-out',
      },
      transitionDuration: {
        vinyl: '300ms',
      },
    },
  },
  plugins: [],
};
