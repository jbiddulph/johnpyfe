const brand = {
  50: '#F3FBFA',
  100: '#D5F4EF',
  200: '#ABE8DF',
  300: '#74D4C6',
  400: '#3BBEAD',
  500: '#16A394',
  600: '#0E8579',
  700: '#0C6B62',
  800: '#0F5550',
  900: '#104743',
  950: '#052E2B',
  DEFAULT: '#0E8579',
  dark: '#0C6B62',
  light: '#3BBEAD',
}

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
        brand,
        primary: brand,
        surface: {
          DEFAULT: '#F6F3EE',
          dark: '#111827',
        },
        pin: {
          DEFAULT: '#E53935',
          dark: '#C62828',
        },
        pint: {
          DEFAULT: '#F5B301',
          dark: '#D97706',
        },
      },
    },
  },
  plugins: [],
}
