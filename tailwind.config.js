/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#00B78E",
        secondary: "#004C3F",
        darkbg: "#1B1B1B",
        text: "#F2F2F2",
      },
      fontFamily: { sans: ["Inter","ui-sans-serif","system-ui"] },
    },
  },
  plugins: [],
}
