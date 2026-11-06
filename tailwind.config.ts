import type { Config } from "tailwindcss";

// PO-tential palette, styled after blaser.de: anthracite + white, warm greys
// instead of cool slate, and a restrained bronze accent. "slate" is overridden
// with warm greys so every existing slate-* class picks up the new look.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#F7F6F4",
          100: "#EFEDEA",
          200: "#E2DFDA",
          300: "#CBC6BE",
          400: "#9C968D",
          500: "#757068",
          600: "#57534D",
          700: "#403D39",
          800: "#2B2927",
          900: "#1A1918",
          950: "#0F0E0D",
        },
        brand: {
          50: "#F8F4EC",
          100: "#EFE5D2",
          200: "#DFCBA6",
          300: "#CBAB74",
          400: "#B8924F",
          500: "#A07D3F",
          600: "#846533",
          700: "#684F29",
          800: "#4C3A1F",
        },
      },
      fontFamily: {
        sans: ["'Inter Variable'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
