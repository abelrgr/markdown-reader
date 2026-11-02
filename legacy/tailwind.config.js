/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./resources/**/*.html"],
  theme: {
    extend: {
      colors: {
        "blue": "#3282d3",
        "blue-dark": "#1c5a9c",
      },
    },
  },
  plugins: [],
};
