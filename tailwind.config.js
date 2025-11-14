/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4C6FFF",
          50: "#F8FAFF",
          100: "#EEF2FF",
          200: "#BFC9FF",
          300: "#98ADFF",
          400: "#6F8AFF",
          500: "#4C6FFF",
          600: "#3B5BFF",
          700: "#3049D6",
          800: "#2436A3",
          900: "#1A2673",
        },
        highlight: "#BFC9FF",
        background: "#FFFFFF",
        heading: "#1A1A1A",
        body: "#222222",
      },
      fontFamily: { sans: ["Inter","ui-sans-serif","system-ui"] },
    },
  },
  plugins: [],
}
