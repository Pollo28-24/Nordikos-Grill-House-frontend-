/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],

  theme: {
    extend: {

      /* =========================
         COLORES EXISTENTES
      ========================= */
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


        /* =========================
           POS DESIGN SYSTEM
        ========================= */

        pos: {

          bg: '#121212',

          surface: '#1E1E1E',

          hover: '#1A1A1A',

          image: '#121212',

          border: 'rgba(0,0,0,0.40)',

          divider: 'rgba(0,0,0,0.30)',

          dividerSoft: 'rgba(0,0,0,0.20)',

          text: '#F5F5F5',

          textMuted: '#B0B0B0',

          textSoft: '#888888',

          accent: '#FFB300',

          accentHover: '#FFC107',

        }
      },


      /* =========================
         BORDER RADIUS
      ========================= */

      borderRadius: {

        pos: '12px',

        'pos-lg': '16px',

        'pos-xl': '20px',

      },


      /* =========================
         SOMBRAS PROFESIONALES
      ========================= */

      boxShadow: {

        pos: '0 4px 20px rgba(0,0,0,0.35)',

        'pos-hover': '0 8px 32px rgba(0,0,0,0.45)',

      },


      /* =========================
         ANIMACIONES
      ========================= */

      animation: {

        'fade-in': 'fadeIn 0.3s ease-out',

        'card-pop': 'cardPop 0.18s ease-out',

      },

      keyframes: {

        fadeIn: {

          '0%': {
            opacity: 0,
            transform: 'translateY(-10px)'
          },

          '100%': {
            opacity: 1,
            transform: 'translateY(0)'
          }

        },

        cardPop: {

          '0%': {
            transform: 'scale(.96)',
            opacity: .7
          },

          '100%': {
            transform: 'scale(1)',
            opacity: 1
          }

        }

      },


      /* =========================
         MAX WIDTH UI
      ========================= */

      maxWidth: {

        'pos': '1400px',

      }

    },
  },

  plugins: [],
}