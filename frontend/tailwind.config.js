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
        gray: {
          50: '#f5f7fa',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#8b95a7', // text-muted
          500: '#64748b',
          600: '#1c2536', // border
          700: '#151b2a', // surface-3
          800: '#101522', // surface-2
          900: '#0b0f18', // surface
          950: '#070a12', // bg
        },
        primary: {
          50: '#eff6ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // purple
          600: '#4F7CFF', // The main electric blue/indigo requested
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
}
