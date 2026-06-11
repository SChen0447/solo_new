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
        primary: {
          DEFAULT: '#2C3E50',
          light: '#34495E',
          dark: '#1A252F',
        },
        accent: {
          blue: '#3498DB',
          orange: '#E67E22',
          green: '#2ECC71',
          purple: '#9B59B6',
          red: '#E74C3C',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
