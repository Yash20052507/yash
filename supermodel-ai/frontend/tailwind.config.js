// tailwind.config.js
const colors = require('tailwindcss/colors');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      colors: {
        primary: colors.sky,
        secondary: colors.indigo,
        neutral: colors.slate,
        // Example specific shades:
        // primary: {
        //   DEFAULT: '#0EA5E9', // sky-500
        //   light: '#38BDF8',   // sky-400
        //   dark: '#0369A1',    // sky-700
        //   // You can add more shades like 50, 100, ..., 900
        //   ...colors.sky // Spread all sky colors if needed directly
        // },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
