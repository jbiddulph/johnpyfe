/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js}',
    './pages/**/*.{vue,js}',
    './layouts/**/*.{vue,js}',
    './app.config.ts',
    './assets/css/**/*.{css}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent: lime green + pale pastel green (replaces former amber/orange)
        primary: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
          950: '#1a2e05',
          DEFAULT: '#65a30d',
          dark: '#4d7c0f',
          light: '#a3e635',
        },
      },
    },
  },
  plugins: [],
}
