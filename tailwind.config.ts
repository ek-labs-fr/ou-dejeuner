import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette sampled from document/logo.png.
        copper: {
          50: "#FBF1E9",
          100: "#F2DCC8",
          200: "#E4B998",
          300: "#D29465",
          400: "#BD7641",
          500: "#A65F2E",
          600: "#8C4D24",
          700: "#6F3B1B",
          800: "#542C14",
          900: "#3C1F0E",
        },
        teal: {
          50: "#E6EFEE",
          100: "#C2D7D4",
          200: "#8DB3AE",
          300: "#5C8E89",
          400: "#356E69",
          500: "#1F5F5C",
          600: "#194B49",
          700: "#143B39",
          800: "#0F2D2C",
          900: "#0A1F1E",
        },
        cream: {
          DEFAULT: "#F5F0E8",
          50: "#FBF8F2",
          100: "#F5F0E8",
          200: "#EBE2D2",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
