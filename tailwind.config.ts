import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7ccbfc",
          400: "#36b2f8",
          500: "#0c99e9",
          600: "#0079c7",
          700: "#0060a1",
          800: "#045285",
          900: "#0a446e",
          950: "#062b49",
        },
        surface: {
          0: "#0a0e17",
          1: "#111827",
          2: "#1a2236",
          3: "#243049",
          4: "#2e3e5c",
        },
        gain: "#22c55e",
        loss: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [typography],
};

export default config;
