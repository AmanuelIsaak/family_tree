/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Instrument Serif', 'serif'],
        body: ['Geist', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
