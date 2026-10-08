/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Experimental MATRIX red, white and black palette
        void: '#050506',
        deep: '#080809',
        surface: '#101012',
        'surface-2': '#171719',
        'surface-3': '#202023',
        electric: '#C44552',
        ice: '#F4F4F5',
        primary: '#C44552',
        secondary: '#F4F4F5',
        'secondary-deep': '#A8323D',
        'secondary-royal': '#842A32',
        highlight: '#FFFFFF',
        paper: '#F4F4F5',
        accent: '#C44552',
        muted: '#A1A1AA',
      },
      fontFamily: {
        sans: ['"Archivo"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Archivo"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 20px 50px rgba(0,0,0,0.45)',
        'card-hover': '0 20px 44px -18px rgba(0,0,0,0.65), 0 0 32px -18px rgba(196,69,82,0.18)',
        'admin-glow': '0 20px 60px rgba(0,0,0,0.55), 0 0 50px -16px rgba(196,69,82,0.35)',
      },
    },
  },
  plugins: [],
}
