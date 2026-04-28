import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102a43",
        mist: "#f2f7fb",
        ember: "#f97316",
        pine: "#0f766e",
        berry: "#be123c",
        gold: "#d97706"
      },
      fontFamily: {
        sans: [
          "Manrope",
          "ui-sans-serif",
          "system-ui"
        ]
      },
      boxShadow: {
        soft: "0 20px 45px -25px rgba(16, 42, 67, 0.35)"
      },
      backgroundImage: {
        "board-grid": "linear-gradient(rgba(16,42,67,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16,42,67,0.05) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
