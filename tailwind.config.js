/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // MATRIX design system: ink base, warm paper text, silver neutrals, ONE accent (green for 2.0, red for the 1.0 section), amber used sparingly.
        ink: { DEFAULT: '#0A0B0A', 2: '#101211', 3: '#171917' },
        paper: '#ECE8DF',
        silver: '#9A9E98',
        // accent is a CSS variable so a section can re-theme itself (Vibe Coding 1.0 is red, 2.0 is green).
        accent: { DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)', dim: '#2BB868', strong: 'rgb(var(--accent-rgb) / <alpha-value>)' },
        amber: { DEFAULT: '#E3A93B', 400: '#E3A93B', 300: '#EBC067', 200: '#F2D697' },
        // Legacy token names (dashboard / admin / auth pages) remapped to the new system.
        void: '#0A0B0A',
        deep: '#0A0B0A',
        surface: '#101211',
        'surface-2': '#171917',
        'surface-3': '#1D201D',
        primary: '#35E884',
        secondary: '#B4B7AE',
        muted: '#9A9E98',
        // The old cyan / sky / slate ramps become warm silver neutrals + the accent, so every existing page shifts with the system.
        cyan: { 50: '#F6F4EE', 100: '#ECE8DF', 200: '#DAD7CD', 300: '#B9BCB3', 400: '#35E884', 500: '#2BB868', 600: '#238F52', 700: '#1B6B3E', 800: '#144B2C', 900: '#0E321E' },
        sky: { 50: '#F6F4EE', 100: '#ECE8DF', 200: '#D2CFC5', 300: '#B0B3AA', 400: '#8D918A', 500: '#6F736D', 600: '#555955', 700: '#3D403D', 800: '#272927', 900: '#171917' },
        slate: { 50: '#F6F4EE', 100: '#ECE8DF', 200: '#D6D3C9', 300: '#BDBFB6', 400: '#9A9E98', 500: '#767B75', 600: '#555A55', 700: '#3A3E3A', 800: '#242724', 900: '#151716' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Instrument Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { label: '0.14em' },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
