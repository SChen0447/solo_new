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
        primary: '#6c63ff',
        'editor-bg': '#f5f5f5',
        'editor-text': '#333333',
        'editor-border': '#dddddd',
        'play-bg': '#1a1a2e',
        'play-text': '#e0e0e0',
      },
      borderRadius: {
        'node': '12px',
        'pill': '9999px',
      },
      boxShadow: {
        'node-selected': '0 0 0 2px #6c63ff, 0 8px 24px rgba(108, 99, 255, 0.3)',
        'node-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
        'serif': ['Source Han Serif SC', 'Noto Serif SC', 'serif'],
      },
    },
  },
  plugins: [],
};
