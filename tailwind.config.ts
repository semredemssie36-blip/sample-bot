import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./screens/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nova: {
          bg:      "#0a0818",
          card:    "#130f2a",
          border:  "#251c4a",
          purple:  "#7c3aed",
          violet:  "#a855f7",
          pink:    "#ec4899",
          gold:    "#f59e0b",
          amber:   "#fbbf24",
          green:   "#10b981",
          red:     "#ef4444",
          blue:    "#3b82f6",
          muted:   "rgba(167,139,250,0.5)",
          dim:     "rgba(167,139,250,0.25)",
        },
      },
      backgroundImage: {
        "nova-gradient":  "linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#ec4899 100%)",
        "gold-gradient":  "linear-gradient(135deg,#f59e0b 0%,#fbbf24 50%,#fcd34d 100%)",
        "green-gradient": "linear-gradient(135deg,#059669 0%,#10b981 100%)",
        "card-gradient":  "linear-gradient(180deg,#180f35 0%,#0a0818 100%)",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
