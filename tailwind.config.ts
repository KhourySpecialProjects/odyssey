import type { Config } from "tailwindcss";
import { wedgesTW } from "@lemonsqueezy/wedges";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "node_modules/@lemonsqueezy/wedges/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {},
  plugins: [wedgesTW()],
};

export default config;
