const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,mdx,md}', './app/**/*.{ts,tsx,mdx,md}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          500: '#5B6CFB',
          600: '#4557e0',
        },
        coral: '#FF7D64',
        ink: '#0F172A',
        slate: '#1F2937',
        ash: '#4B5563',
        fog: '#9CA3AF',
        mist: '#E5E7EB',
        cloud: '#F8FAFC',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
