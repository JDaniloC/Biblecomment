import type { Config } from "tailwindcss";

// Tailwind v4: theme tokens live in `src/app/globals.css` under `@theme`.
// This file is kept only so `next lint` and existing tooling can resolve
// the `tailwind.config.ts` import path. Do NOT add `theme.extend.colors`
// here — v4 ignores it, and we hit a bug where `bg-brand` silently failed
// because the rule was never generated.
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [],
};

export default config;
