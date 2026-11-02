/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0284C7', // Ocean Blue - Trust Higienis
        accent: '#EA580C',  // Tangerine - CTA Grosir
        eco: '#059669',     // Emerald - Badge Eco
        background: '#F1F5F9',
        surface: '#FFFFFF',
        ink: '#0F172A',
      },
      boxShadow: {
        'hard': '6px 6px 0px #0F172A',
        'hard-primary': '6px 6px 0px #0284C7',
        'hard-accent': '6px 6px 0px #EA580C',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Lexend', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
