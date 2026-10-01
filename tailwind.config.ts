import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Laranja "brasa" — cor principal da FAST CHICKN
        brand: {
          50: "#FFF4ED",
          100: "#FFE6D5",
          200: "#FFC9A9",
          300: "#FFA372",
          400: "#FF7A3D",
          500: "#FF5A1F",
          600: "#EB3F0C",
          700: "#C22E0C",
          800: "#9A2712",
          900: "#7C2312",
        },
        // Amarelo "mostarda" — destaques e promoções
        accent: {
          50: "#FFFBEA",
          100: "#FFF2C5",
          200: "#FFE587",
          300: "#FFD248",
          400: "#FFC529",
          500: "#F9A307",
          600: "#DD7A02",
        },
        ink: {
          DEFAULT: "#17130F",
          50: "#F7F5F3",
          100: "#EDE9E5",
          200: "#DAD3CC",
          300: "#BAB0A6",
          400: "#91857A",
          500: "#6F645A",
          600: "#554C44",
          700: "#3D3631",
          800: "#29241F",
          900: "#17130F",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 12px -2px rgba(23, 19, 15, 0.08), 0 1px 3px rgba(23, 19, 15, 0.05)",
        lift: "0 12px 32px -8px rgba(23, 19, 15, 0.18)",
        glow: "0 8px 24px -6px rgba(255, 90, 31, 0.45)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(255, 90, 31, 0.55)" },
          "70%": { boxShadow: "0 0 0 14px rgba(255, 90, 31, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255, 90, 31, 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "slide-up": "slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) both",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
