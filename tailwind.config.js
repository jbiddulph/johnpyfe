/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,vue}', // Adjust the paths according to your project structure
    './components/**/*.{vue,js}', // Include components directory
    './pages/**/*.{vue,js}', // Include pages directory
    './layouts/**/*.{vue,js}', // Include layouts directory
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1abc9c', // Change this to your desired green color
          dark: '#16a085', // Optional: Add a darker shade
          light: '#2ecc71', // Optional: Add a lighter shade
        },
      },
    },
  },
  plugins: [],
}

