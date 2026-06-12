/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matte: {
          DEFAULT: '#0a0a0a',
          50: '#0f0f0f',
          100: '#1a1a1a',
          150: '#222222',
          200: '#2a2a2a',
          300: '#3a3a3a',
          400: '#4a4a4a',
        },
        neon: {
          DEFAULT: '#39ff14',
          dim: '#2ecc11',
          dark: '#1a7a0a',
          soft: 'rgba(57, 255, 20, 0.6)',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 8px rgba(57, 255, 20, 0.15)',
        'neon': '0 0 16px rgba(57, 255, 20, 0.2)',
        'neon-lg': '0 0 30px rgba(57, 255, 20, 0.15)',
        'inner-neon': 'inset 0 0 12px rgba(57, 255, 20, 0.08)',
        'brand': '0 0 20px rgba(57, 255, 20, 0.1), 0 0 40px rgba(57, 255, 20, 0.05)',
        'brand-sm': '0 0 10px rgba(57, 255, 20, 0.08)',
      },
    },
  },
  plugins: [],
}
