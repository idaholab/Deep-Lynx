import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        cherenkov: "#07519E", // INL Dark Blue
        electricity: "#2BA8E0", // INL Light Blue
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
  darkMode: "selector",
  corePlugins: {
    preflight: true, // Apply tailwind styles only after MUI has applied its native styles and theme to our UX components
  },
} satisfies Config;
