import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F8F6F1",
        charcoal: "#1C1C1C",
        taupe: "#B8A99A",
        gold: "#C6A15B",
        beige: "#E5E0D8",
        grayx: "#77736E",
        green: "#5E7A5E",
        red: "#B15C4A",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
