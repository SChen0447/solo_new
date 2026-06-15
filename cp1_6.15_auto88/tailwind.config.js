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
        warm: '#f7f3e3',
        wood: '#c8a882',
        'wood-dark': '#a0784c',
        ink: '#2d2d2d',
        priority: {
          high: '#e74c3c',
          medium: '#f39c12',
          low: '#2ecc71',
        },
        panel: '#fafafa',
        splitter: '#ddd',
      },
      fontFamily: {
        journal: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Noto Sans SC"', '"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
