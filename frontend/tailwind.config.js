/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pw: {
          red: "#B71C1C",
          darkred: "#8B0000",
          blue: "#1E3A8A",
          dark: "#0F172A",
          card: "#1E293B",
          border: "#334155",
          accent: "#38BDF8"
        }
      }
    },
  },
  plugins: [],
}
