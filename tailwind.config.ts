import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0a",
          card: "#141414",
          hover: "#1c1c1c",
          input: "#1a1a1a",
        },
        border: {
          DEFAULT: "#262626",
          hover: "#333333",
        },
        accent: {
          DEFAULT: "#f97316",
          hover: "#ea580c",
          muted: "#7c2d12",
        },
        text: {
          DEFAULT: "#fafafa",
          muted: "#a3a3a3",
          subtle: "#737373",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.4)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(249,115,22,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
