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
    paper: "w-80 bg-cherenkov text-white",
    button:
      "w-full justify-start text-black hover:bg-gray-500 dark:text-white dark:hover:bg-gray-800",
    typography: "p-1 text-white normal-case text-base", 
    header: "normal-case text-small"
  },
  fab: "gray-500 dark:gray-800",
  font: {
    colors: {
      // These colors are registered in tailwind.config.ts
      cherenkov: `text-cherenkov`,
      electricity: `text-electricity`,
      white: 'text-white'
    },
  },
  grid: "p-10",
  icon: "fill-white dark:fill-gray-100 hover:bg-transparent",
  logo: "pl-8",
  toolbar: "h-full p-0 bg-[#083769]",
  basicDrawer: " flexShrink: 0, boxSizing: 'border-box'",
  sidenav: {
    header: "text-left p-6 font-bold text-lg",
    div: "p-6 py-2 text-sm",
    header2: "p-6 pb-2 text-lg", 
    listItem: "list-disc text-sm", 
    answer: "pl-10"

  }, 
  containers: {
    gridItem: "max-w-[400px] min-w-[400px] ml-[30px]",
    addItem: "grid justify-items-center min-h-44",
    paperItem: "grid justify-items-center min-h-44 bg-[#D2CDCD]",
    addIcon: "text-cherenkov scale-[2]", 
    buttons: "mb-4",
    text: "lowercase", 
    header: "mb-0 ml-7 justify-between", 
    dialog: {
      header: "text-center text-2xl m-2"
    }

  }
};
