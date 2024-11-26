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
        containerGray: "#EEF1F6", // Gray container drawer
        darkBlue: '#083769', 
        basicSideNav: '#EEF1F6', 
        dialogGray: '#E9EDF0', 
        strokeGray: '#B2B2B2', 
        accent: "#07519E"
      },
    }, 
    fontFamily: {
      sans: ['Roboto Flex', 'sans-serif'],
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require('daisyui')
  ],
  daisyui: {
    themes: [
      {
        customtheme: {
          "primary": "#07519E", // INL Dark Blue
          "secondary": "#2BA8E0", // INL Light Blue
          "accent": "#07519E",
          "neutral": "#3D4451",
          "base-100": "#FFFFFF",
          "info": "#2BA8E0", // INL Light Blue
          "success": "#36D399",
          "warning": "#FBBD23",
          "error": "#F87272",
          "container-gray": "#EEF1F6", // Gray container drawer
          "dark-blue": '#083769', 
          "basic-sidenav": '#EEF1F6', 
          "dialog-gray": '#E9EDF0', 
          "stroke-gray": '#B2B2B2',
        },
      },
      "light", // Keep the default light theme as a fallback
    ],
  },
  darkMode: "class", // Changed from "selector" to "class" for simplicity
  corePlugins: {
    preflight: false, // Apply Tailwind styles only after MUI has applied its native styles and theme to our UX components
  },
} satisfies Config;