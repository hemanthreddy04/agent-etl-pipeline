/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // zinc 950
        card: '#18181b', // zinc 900
        cardLight: '#27272a', // zinc 800
        accent: '#3f3f46', // zinc 700
        textPrimary: '#fafafa', // zinc 50
        textSecondary: '#a1a1aa', // zinc 400
        primary: '#3b82f6', // blue-500
        primaryHover: '#2563eb', // blue-600
        success: '#10b981', // emerald-500
        warning: '#f59e0b', // amber-500
        danger: '#ef4444', // red-500
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
