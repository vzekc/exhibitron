/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
      },
    },
    fontSize: {
      base: ['18px', '24px'], // [fontSize, lineHeight]
      sm: ['14px', '20px'],
      lg: ['18px', '28px'],
      xl: ['20px', '32px'],
      '2xl': ['24px', '36px'],
      '3xl': ['30px', '42px'],
      '4xl': ['36px', '48px'],
    },
  },
  plugins: [],
}

