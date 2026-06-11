/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '16px',
        md: '24px',
      },
    },
    extend: {
      colors: {
        primary: '#1a237e',
        accent: '#ff6f00',
        lightBlue: '#e3f2fd',
        lightYellow: '#fff3e0',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
};
