import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Futuristic dark-theme palette
        neon: {
          blue: "#3b82f6",
          cyan: "#22d3ee",
          gold: "#fbbf24",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(34,211,238,0.5), 0 0 60px rgba(59,130,246,0.3)",
          },
          "50%": {
            boxShadow:
              "0 0 40px rgba(34,211,238,0.8), 0 0 100px rgba(59,130,246,0.5)",
          },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
