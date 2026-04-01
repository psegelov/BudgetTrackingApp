export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#166534',
          hover: '#14532d',
          light: '#dcfce7',
        },
        accent: '#16a34a',
        surface: '#ffffff',
        border: '#d1e8d9',
        bg: '#f2f8f4',
        muted: '#4b7a57',
        subtle: '#86a98e',
        ink: '#1a2e1e',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(22,101,52,0.08), 0 1px 2px rgba(22,101,52,0.04)',
        'card-md': '0 4px 6px rgba(22,101,52,0.07), 0 2px 4px rgba(22,101,52,0.05)',
      },
    },
  },
  plugins: [],
}