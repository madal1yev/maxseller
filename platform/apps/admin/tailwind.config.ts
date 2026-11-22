import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#030805',
          900: '#07130C',
          850: '#0a1710',
          800: '#0b1a12',
          700: '#10251a',
          600: '#163323',
        },
        brand: {
          DEFAULT: '#00E676',
          50: '#E9FFF4',
          100: '#C6FFE0',
          200: '#8EFFC2',
          300: '#52F5A1',
          400: '#1BEE82',
          500: '#00E676',
          600: '#00B95E',
          700: '#008F49',
          800: '#006B37',
          900: '#004725',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.35rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(0,230,118,.18), 0 12px 40px -12px rgba(0,230,118,.28)',
        'glow-lg': '0 0 0 1px rgba(0,230,118,.24), 0 24px 70px -18px rgba(0,230,118,.35)',
        panel: '0 24px 60px -32px rgba(0,0,0,.85)',
      },
      backgroundImage: {
        'brand-fade': 'linear-gradient(135deg, rgba(0,230,118,.14), rgba(0,230,118,0) 60%)',
        'page-glow':
          'radial-gradient(900px 460px at 8% -8%, rgba(0,230,118,.10), transparent 62%), radial-gradient(700px 420px at 100% 0%, rgba(0,230,118,.06), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s ease-out both',
        'pulse-glow': 'pulse-glow 2.6s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
}

export default config
