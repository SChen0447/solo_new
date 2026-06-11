/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cream: '#FFF8F0',
        coral: {
          light: '#FFA8A8',
          DEFAULT: '#FF6B6B',
          dark: '#E85555',
        },
        fog: {
          light: '#A8D8FF',
          DEFAULT: '#74B9FF',
          dark: '#5BA3E8',
        },
        lavender: {
          light: '#D4B8E8',
          DEFAULT: '#B39DDB',
          dark: '#9575CD',
        },
        grid: '#E8E4E0',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"DM Sans"', 'sans-serif'],
        display: ['"DM Sans"', '"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-scale-in': 'fadeScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-scale-out': 'fadeScaleOut 0.2s ease-in forwards',
        'vote-pop': 'votePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeScaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeScaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        votePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
