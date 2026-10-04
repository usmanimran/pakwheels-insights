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
          red: {
            DEFAULT: "#C8232C",
            50: "#FEF2F2",
            100: "#FEE2E2",
            500: "#E02832",
            600: "#C8232C",
            700: "#A81B23",
            800: "#8B131A",
            900: "#6B0D13"
          },
          navy: {
            DEFAULT: "#0D2342",
            700: "#1A3B6B",
            750: "#15315B",
            800: "#112646",
            850: "#0E203B",
            900: "#0A192F",
            950: "#061021"
          },
          blue: {
            DEFAULT: "#1D70B8",
            400: "#38BDF8",
            500: "#2563EB",
            600: "#1D70B8"
          },
          gold: "#F59E0B",
          emerald: "#10B981"
        }
      }
    },
  },
  plugins: [],
}
