import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        leaf: "#2f7d5a",
        mint: "#dff3e8",
        sky: "#dceeff",
        coral: "#ff775f",
        oat: "#f8f2e7",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 33, 27, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
