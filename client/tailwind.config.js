/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4A017',
          light: '#E8B820',
          dark: '#A67C00',
        },
        surface: {
          DEFAULT: '#1A1A1A',
          border: '#2A2A2A',
          elevated: '#222222',
        },
        bg: '#0F0F0F',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'coin-flip': 'coin-flip 0.8s ease-in-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'xp-pop': 'xp-pop 0.5s ease-out forwards',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'coin-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'xp-pop': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(1.2)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
