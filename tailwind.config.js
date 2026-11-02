/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0284C7',
          dark: '#0369A1',
          light: '#E0F2FE',
        },
        accent: {
          DEFAULT: '#EA580C',
          dark: '#C2410C',
          light: '#FFEDD5',
        },
        eco: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#D1FAE5',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        ink: '#0F172A',
      },
      boxShadow: {
        'hard-sm': '2px 2px 0px #0F172A',
        'hard': '4px 4px 0px #0F172A',
        'hard-lg': '6px 6px 0px #0F172A',
        'hard-primary': '4px 4px 0px #0284C7',
        'hard-accent': '4px 4px 0px #EA580C',
        'hard-eco': '4px 4px 0px #059669',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Lexend', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
