import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
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
      // Formerly provided by the @lemonsqueezy/wedges plugin; kept so
      // existing `xs:`, `text-5xl`+, and theme-color classes render the same.
      screens: {
        xs: "480px",
      },
      fontSize: {
        "5xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.075rem" }],
        "6xl": [
          "3.75rem",
          { lineHeight: "4.5rem", letterSpacing: "-0.09375rem" },
        ],
        "7xl": ["4.5rem", { lineHeight: "5rem", letterSpacing: "-0.1125rem" }],
        "8xl": ["6rem", { lineHeight: "6.5rem", letterSpacing: "-0.15rem" }],
        "9xl": ["8rem", { lineHeight: "8rem", letterSpacing: "-0.2rem" }],
      },
      // Values live in app/globals.css (light on :root, dark on .dark)
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          300: "hsl(var(--primary-300) / <alpha-value>)",
          500: "hsl(var(--primary-500) / <alpha-value>)",
          600: "hsl(var(--primary-600) / <alpha-value>)",
        },
        secondary: "hsl(var(--secondary) / <alpha-value>)",
        destructive: "hsl(var(--destructive) / <alpha-value>)",
      },
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
    // `light:` variant (next-themes puts `light`/`dark` on <html>), formerly
    // provided by the @lemonsqueezy/wedges plugin.
    plugin(({ addVariant }) => {
      addVariant("light", "&:is(.light *)");
    }),
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;

export default config;
