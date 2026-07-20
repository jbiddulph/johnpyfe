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
        // Brand accent: blue + pale pastel blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: '#60a5fa',
        },
      },
    },
  },
  plugins: [],
}
