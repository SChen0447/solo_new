/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'warm-orange': {
          50: '#FFF8F0',
          100: '#FFECD2',
          200: '#FFD6A5',
          300: '#FFBE76',
          400: '#FF9F43',
          500: '#FF8C28',
          600: '#F57C00',
          700: '#E65100',
          800: '#BF360C',
          900: '#8C2A00',
        },
        'cream': {
          50: '#FFFEF9',
          100: '#FFF9EE',
          200: '#FFF3DC',
          300: '#FFE8C2',
          400: '#FFD89E',
          500: '#FFC97A',
        },
        'dark-brown': {
          50: '#F5F0EB',
          100: '#E8DFD4',
          200: '#D4C4AE',
          300: '#B8A07E',
          400: '#9C7E5A',
          500: '#7D5E3D',
          600: '#5D4427',
          700: '#4A3420',
          800: '#38281A',
          900: '#2A1E13',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(125, 94, 61, 0.08)',
        'soft-hover': '0 8px 24px rgba(125, 94, 61, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'ripple': 'ripple 0.6s ease-out',
        'blink': 'blink 1s ease-in-out infinite',
        'slide-down': 'slideDown 0.3s ease-out',
        'float-up': 'floatUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.4' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-3px)' },
        },
      },
    },
  },
  plugins: [],
};
