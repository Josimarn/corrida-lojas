/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#fef3da', 100:'#fde5a0', 200:'#fac775', 300:'#ef9f27', 400:'#ba7517', 500:'#854f0b', 600:'#633806', 700:'#412402' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
