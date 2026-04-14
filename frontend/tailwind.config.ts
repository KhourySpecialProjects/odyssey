import type { Config } from "tailwindcss";
import { wedgesTW } from "@lemonsqueezy/wedges";

const config: Config = {
  safelist: [
    {
      pattern: /(bg|text|border)-(emerald|amber|red)-(400|500|700|800|900)/,
    },
  ],
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "node_modules/@lemonsqueezy/wedges/dist/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      spacing: {
        40: "10rem",
        56: "14rem",
        72: "18rem",
        84: "21rem",
        96: "24rem",
        22: "5.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        border: {
          to: { "--border-angle": "360deg" },
        },
        sail: {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "15%": { transform: "translateY(-6px) rotate(1.2deg)" },
          "30%": { transform: "translateY(-2px) rotate(-0.5deg)" },
          "50%": { transform: "translateY(-9px) rotate(1.8deg)" },
          "70%": { transform: "translateY(-3px) rotate(-0.8deg)" },
          "85%": { transform: "translateY(-7px) rotate(0.6deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        border: "border 2s linear infinite",
        sail: "sail 6s ease-in-out infinite",
      },
    },
  },
  plugins: [
    wedgesTW(),
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;

export default config;
