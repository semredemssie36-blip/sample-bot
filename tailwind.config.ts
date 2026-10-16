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
        // NovaDrop dark-purple palette
        nova: {
          bg:       "#0d0b1a",   // deepest background
          card:     "#14102a",   // card surface
          border:   "#2a2050",   // subtle border
          purple:   "#7c3aed",   // primary accent
          violet:   "#a855f7",   // lighter accent
          pink:     "#ec4899",   // hot pink
          gold:     "#f59e0b",   // NOVA coin colour
          green:    "#10b981",   // success / positive
          red:      "#ef4444",   // error / negative
          muted:    "#6b7280",   // secondary text
        },
      },
      backgroundImage: {
        "nova-gradient": "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
        "card-gradient": "linear-gradient(180deg, #1a1535 0%, #0d0b1a 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124,58,237,0.4)" },
          "50%":      { boxShadow: "0 0 40px rgba(168,85,247,0.7)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "bounce-light": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-in":     "fade-in 0.35s ease-out",
        "slide-up":    "slide-up 0.4s ease-out",
        "pulse-glow":  "pulse-glow 2s ease-in-out infinite",
        "shimmer":     "shimmer 2s linear infinite",
        "bounce-light":"bounce-light 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
