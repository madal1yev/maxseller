import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* Defaults: bg #030805, surface #07130C, card #0b1a12 */
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        emerald: '#00E676',
        'emerald-dark': '#00a854',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: {
          bg: '#030805',
          surface: '#07130C',
          card: '#0b1a12',
          emerald: '#00E676',
          dark: '#00a854',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'ui-sans-serif', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.35rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        glow: '0 0 32px rgba(0, 230, 118, 0.22)',
        'glow-lg': '0 0 64px rgba(0, 230, 118, 0.3)',
        card: '0 18px 50px -20px rgba(0, 0, 0, 0.8)',
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 50% 0%, rgba(0,230,118,0.12), transparent 55%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
