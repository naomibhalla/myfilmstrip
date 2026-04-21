import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f5f1e8",
        ecru: "#ebe3d3",
        sand: "#c9b89a",
        ink: "#3a2f25",
        sepia: "#8a7560",
        faded: "#b5a590",
        tomato: "#d96846",
        sunset: "#e89b5a",
        rose: "#d4a5a5",
        sage: "#a8b59c",
        sky: "#8ea9b5",
      },
      fontFamily: {
        mono: ["var(--font-typewriter)", "Courier New", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"],
        italic: ["var(--font-italic)", "Georgia", "serif"],
      },
      animation: {
        "tape-drop": "tapeDrop 0.4s ease-out",
        "developing": "developing 2s ease-in-out infinite",
        "wiggle": "wiggle 0.3s ease-in-out",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        tapeDrop: {
          "0%": { opacity: "0", transform: "translateY(-20px) rotate(-10deg)" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(var(--tw-rotate, 0))" },
        },
        developing: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-3deg)" },
          "75%": { transform: "rotate(3deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
