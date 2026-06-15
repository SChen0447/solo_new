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
          light: '#667eea',
          dark: '#764ba2',
        },
        status: {
          available: '#4caf50',
          borrowed: '#ff9800',
          reserved: '#2196f3',
        },
        surface: {
          white: '#ffffff',
          light: '#f5f5f7',
          card: '#fafafa',
        },
        review: {
          pending: '#ff9800',
          approved: '#4caf50',
          rejected: '#f44336',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px #00000020',
        'card-hover': '0 8px 24px #00000040',
        nav: '0 1px 0 #00000010',
        dropdown: '0 4px 16px #00000020',
        stat: '0 2px 8px #00000015',
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
        button: '22px',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
