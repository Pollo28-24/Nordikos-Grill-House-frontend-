/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': '#f59e0b',
        'dark-primary': '#222222',
        'accent': '#FA8112',
        'light-secondary': '#F5E7C6',
        'light-primary': '#FAF3E1',
        'deep-charcoal': '#121212',
        'gunmetal-grey': '#1E1E1E',
        'flame-orange': '#E65100',
        'amber-gold': '#FFB300',
        'off-white': '#F5F5F5',
        'muted-grey': '#B0B0B0',
        'soft-red': '#D32F2F',
      },
        animation: {
      'fade-in': 'fadeIn 0.3s ease-out'
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: 0, transform: 'translateY(-10px)' },
        '100%': { opacity: 1, transform: 'translateY(0)' }
      }
    }
    },
  },
  plugins: [],
}
