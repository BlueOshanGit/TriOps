/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HubSpot-inspired colors
        hubspot: {
          orange: '#ff7a59',
          'orange-dark': '#e86a4a',
          blue: '#00a4bd',
          'blue-dark': '#0091a8',
          dark: '#33475b',
          gray: '#516f90',
          light: '#f5f8fa',
          border: '#cbd6e2'
        }
      },
      fontFamily: {
        sans: ['Lexend Deca', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif']
      }
    },
  },
  plugins: [],
}
