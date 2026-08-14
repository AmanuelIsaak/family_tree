/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Noto Sans Ethiopic', 'Georgia', 'serif'],
        body: ['Inter', 'Noto Sans Ethiopic', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Friendship-level accent palette (level 1 = closest)
        lvl1: '#ef4444',
        lvl2: '#f97316',
        lvl3: '#eab308',
        lvl4: '#22c55e',
        lvl5: '#06b6d4',
        lvl6: '#6366f1',
        lvl7: '#a855f7',
      },
    },
  },
  plugins: [],
};
