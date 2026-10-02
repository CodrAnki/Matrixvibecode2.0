/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // MATRIX Vibe Coding 2.0 — Obsidian Cinematic 3D, Green identity + Blue/Cyan futuristic accent
        void: '#020611',
        deep: '#030914',
        surface: '#06111F',
        'surface-2': '#0A1626',
        'surface-3': '#0F1E30',
        electric: '#00D9FF',
        ice: '#e0f2fe',
        primary: '#00FF66',
        secondary: '#00D9FF',
        'secondary-deep': '#008CFF',
        'secondary-royal': '#2563FF',
        highlight: '#6DFFFF',
        paper: '#F5FAFF',
        accent: '#FF3045',
        muted: '#8B9691',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 20px 50px rgba(0,0,0,0.45)',
        'card-hover': '0 30px 70px rgba(0,0,0,0.6), 0 0 60px -18px rgba(0,255,102,0.35), 0 0 40px -20px rgba(0,217,255,0.3)',
        'admin-glow': '0 20px 60px rgba(0,0,0,0.55), 0 0 50px -16px rgba(0,140,255,0.45), 0 0 30px -18px rgba(37,99,255,0.4)',
      },
    },
  },
  plugins: [],
}
