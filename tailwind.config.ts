import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102a2b',
        paper: '#f4f8f6',
        brand: {
          50: '#eefaf6',
          100: '#d7f2e8',
          500: '#16876c',
          600: '#0f6e59',
          700: '#0d594a',
          900: '#123d36'
        },
        ocean: '#247aa7',
      },
      boxShadow: {
        soft: '0 18px 55px rgba(16, 42, 43, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
