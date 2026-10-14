/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f97316',
          amber: '#f59e0b',
          dark: '#090d16',
          surface: '#111827',
          card: '#1e293b',
          border: '#334155',
        }
      }
    },
  },
  plugins: [],
}
