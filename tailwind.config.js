/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#DA0D17',
          orange: '#DA5513',
          yellow: '#EAB308',
          green: '#4F7043',
          blue: '#265D7C',
          brown: '#56331B',
          pink: '#F29C94',
          beige: '#E8E1D0',
        },
        bg: {
          dark: '#120d0b',
          card: '#1f1714',
          sidebar: '#181210',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
