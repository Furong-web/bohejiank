/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        mint: {
          DEFAULT: '#2BB673',
          dark: '#1E9E60',
          light: '#4FD497'
        },
        ink: {
          900: '#0A1512',
          800: '#0F1F1A',
          700: '#13241E',
          600: '#1A2E27',
          500: '#243B33'
        },
        cyan: { glow: '#36CFC9' }
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 24px rgba(43, 182, 115, 0.25)'
      }
    }
  },
  plugins: []
}
