/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        display: ['Manrope', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        archival: {
          alabaster: 'var(--color-alabaster)',
          paper: 'var(--color-paper)',
          cream: 'var(--color-cream)',
          forest: 'var(--color-forest)',
          terracotta: 'var(--color-terracotta)',
          ochre: 'var(--color-ochre)',
          ink: 'var(--color-ink)',
          body: 'var(--color-body)',
          muted: 'var(--color-muted)',
          line: 'var(--color-line)',
        },
      },
    },
  },
  plugins: [],
};
