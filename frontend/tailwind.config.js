/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          activityBar: '#333333',
          editor: '#1e1e1e',
          panel: '#181818',
          border: '#2d3139',
          hover: '#2a2d2e',
          active: '#37373d',
          accent: '#007acc',
          accentHover: '#0062a3',
          text: '#cccccc',
          muted: '#858585',
          lightBg: '#f3f3f3',
          lightSidebar: '#e8e8e8',
          lightEditor: '#ffffff',
          lightBorder: '#dddddd',
          lightText: '#333333',
          lightMuted: '#666666'
        },
        risk: {
          low: '#22c55e',
          moderate: '#eab308',
          high: '#f97316',
          critical: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
