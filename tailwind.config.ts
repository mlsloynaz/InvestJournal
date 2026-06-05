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
        investep: {
          navy: "#0f2744",
          gold: "#c9a227",
          cream: "#f5f0e6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
