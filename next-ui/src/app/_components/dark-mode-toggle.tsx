"use client";
import React from "react";
import { useTheme } from "next-themes";
import { RiMoonLine, RiSunLine } from "react-icons/ri";

const DarkModeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 text-xl"    
      onClick={() => (theme == "dark" ? setTheme("light") : setTheme("dark"))}>
      {theme === "light" ? (
        <RiMoonLine/>
      ) : (
        <RiSunLine/>
      )}
    </button>   
  );
};

export default DarkModeToggle;