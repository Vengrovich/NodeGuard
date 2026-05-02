/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { mono: ['JetBrains Mono', 'Fira Code', 'monospace'] },
      colors: {
        bg: { primary: '#0d1117', secondary: '#161b22', tertiary: '#1c2128' },
        border: { default: '#21262d', hover: '#30363d' },
        green: { DEFAULT: '#39d353', dim: '#39d35366' },
        purple: { DEFAULT: '#bc8cff' },
        amber: { DEFAULT: '#e3b341' },
        cyan: { DEFAULT: '#56d364' },
        blue: { DEFAULT: '#58a6ff' },
        red: { DEFAULT: '#f85149' },
        muted: '#8b949e'
      }
    }
  },
  plugins: []
}
