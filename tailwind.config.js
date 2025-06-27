/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        gitlab: {
          orange: '#FC6D26',
          purple: '#6B4FBB',
          dark: '#292961',
          gray: '#FAFAFA',
        }
      }
    },
  },
  plugins: [],
}