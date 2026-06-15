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
        bg: '#0f0f23',
        card: '#1a1a2e',
        accent: '#4CAF50',
        'accent-hover': '#388E3C',
        warn: '#FF9800',
        text: '#e0e0e0',
        'text-muted': '#888',
        rise: '#e53935',
        fall: '#43a047',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
