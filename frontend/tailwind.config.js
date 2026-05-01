/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0a0a1a',
          card: '#1a1a2e',
          border: 'rgba(255,255,255,0.06)',
        }
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
