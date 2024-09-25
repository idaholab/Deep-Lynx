/**
 * These classes are defined using TailwindCSS
 * https://tailwindcss.com/docs
 *
 * Add any key-value pair to the classes object below
 * A key is the alphabetized name of a component, and the value is a string of tailwind classes
 *
 * Classes are attributed to MUI components throughout the application using the 'className' prop
 *
 * If you're new to Tailwind, consider talking to ChatHPC about some of the strings below
 * https://chat.hpc.inl.gov/
 */

export const classes = {
  appbar: "flex h-16 justify-center", // 64px
  button: "text-cherenkov dark:text-electricity appearance-none",
  container:
    "h-[calc(100vh-64px)] overflow-auto flex items-center justify-center", // Height must be 100vh minus the AppBar height
  divider: "border-black dark:border-gray-50",
  drawer: {
    sidebar: "pt-8",
    paper: "w-80 bg-gray-400 dark:bg-gray-800",
    button:
      "w-full justify-start text-black hover:bg-gray-500 dark:text-white dark:hover:bg-gray-800",
  },
  font: {
    colors: {
      // These colors are registered in tailwind.config.ts
      cherenkov: `text-cherenkov`,
      electricity: `text-electricity`,
    },
  },
  grid: "p-10",
  icon: "fill-black dark:fill-gray-100 hover:bg-transparent",
  logo: "pl-8",
  toolbar: "h-full p-0 bg-gray-500 dark:bg-gray-800",
};
