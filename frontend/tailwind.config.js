/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pucp: {
          navy: '#0F2042',
          royal: '#1D4ED8',
          ivory: '#F8F9FA',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          forest: '#059669',
          terracotta: '#DC2626',
        },
        brand: {
          primary: '#0F2042',
          accent: '#1D4ED8',
          bg: '#F8F9FA',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          success: '#059669',
          danger: '#DC2626',
        },
        navy: '#0F2042',
        royal: '#1D4ED8',
        ivory: '#F8F9FA',
        forest: '#059669',
        terracotta: '#DC2626',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
