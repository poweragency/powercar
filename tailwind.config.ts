import type { Config } from "tailwindcss";

const withOpacity = (variable: string) => {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`;
    }
    return `rgb(var(${variable}))`;
  };
};

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: withOpacity("--bg") as unknown as string,
          card: withOpacity("--bg-card") as unknown as string,
          hover: withOpacity("--bg-hover") as unknown as string,
          input: withOpacity("--bg-input") as unknown as string,
        },
        border: {
          DEFAULT: withOpacity("--border") as unknown as string,
          hover: withOpacity("--border-hover") as unknown as string,
        },
        accent: {
          DEFAULT: withOpacity("--accent") as unknown as string,
          hover: withOpacity("--accent-hover") as unknown as string,
          muted: withOpacity("--accent-muted") as unknown as string,
          contrast: withOpacity("--accent-contrast") as unknown as string,
        },
        text: {
          DEFAULT: withOpacity("--text") as unknown as string,
          muted: withOpacity("--text-muted") as unknown as string,
          subtle: withOpacity("--text-subtle") as unknown as string,
        },
        status: {
          success: withOpacity("--status-success") as unknown as string,
          warning: withOpacity("--status-warning") as unknown as string,
          danger: withOpacity("--status-danger") as unknown as string,
          info: withOpacity("--status-info") as unknown as string,
        },
        chart: {
          1: withOpacity("--chart-1") as unknown as string,
          2: withOpacity("--chart-2") as unknown as string,
          3: withOpacity("--chart-3") as unknown as string,
          4: withOpacity("--chart-4") as unknown as string,
          5: withOpacity("--chart-5") as unknown as string,
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.08), 0 1px 2px 0 rgb(0 0 0 / 0.04)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px 0 rgb(0 0 0 / 0.06)",
        glow: "0 0 0 1px rgb(var(--accent) / 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
