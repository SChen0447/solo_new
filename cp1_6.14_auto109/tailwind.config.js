/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        geo: {
          bg: '#1a1a2e',
          panel: '#16213e',
          accent: '#4fc3f7',
          text: '#e0e0e0',
        },
      },
    },
  },
  plugins: [],
}
