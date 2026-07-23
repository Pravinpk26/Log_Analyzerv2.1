/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark Enterprise Theme — exact approved palette.
        // Orange is an ACCENT ONLY: active nav, primary buttons, active
        // indicators, important icons, progress rings, hover states, AI
        // branding. It must never be the dominant fill color of a surface.
        base: {
          DEFAULT: '#181818',
          soft: '#1e1e1e',
        },
        panel: {
          DEFAULT: '#242424',
          soft: '#2a2a2a',
          border: '#333333',
        },
        ink: {
          DEFAULT: '#f1efec',
          muted: '#9a9793',
          faint: '#6b6864',
        },
        brand: {
          primary: '#FF6B35',
          orange: '#FF6B35',
          amber: '#FBBF24',
          red: '#ef4444',
          green: '#22c55e',
          // Data-viz-only accents: kept distinct from the orange brand color
          // purely so multi-series charts (line chart, donut) stay legible.
          blue: '#4C8DFF',
          purple: '#B27CFF',
          cyan: '#38bdf8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
}
