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
        'bg-primary': '#1A1A2E',
        'bg-card': '#16213E',
        'bg-input': '#0F3460',
        'accent': '#E94560',
        'accent-hover': '#FF6B6B',
        'text-primary': '#EAF0F1',
        'text-muted': '#8B8FA3',
        'focus-border': '#533483',
      },
    },
  },
  plugins: [],
};
