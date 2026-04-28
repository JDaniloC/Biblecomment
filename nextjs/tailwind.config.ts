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
        tag: {
          devocional: "#4f46e5",
          exegese:    "#0d9488",
          pessoal:    "#d97706",
          inspirado:  "#7c3aed",
        },
      },
      fontFamily: {
        // CSS variables come from next/font/google in app/layout.tsx.
        // Falls back to system fonts if a variable isn't set.
        sans:  ["var(--font-inter)",        "system-ui",  "sans-serif"],
        serif: ["var(--font-merriweather)", "Georgia",     "serif"],
        lora:  ["var(--font-lora)",         "Georgia",     "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
