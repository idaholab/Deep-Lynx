"use client";

// React
import React from "react";

// Hooks
import { useState } from "react";

// Icons
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { themeActions } from "@/lib/store/features/themeSlice";

const DarkModeToggle = () => {
    const [theme, setTheme] = useState<string>(
        useAppSelector((state) => state.theme.theme)
    );
    const storeDispatch = useAppDispatch();

    return (
        <button
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 text-xl"
            onClick={() =>
                theme == "dark"
                    ? storeDispatch(themeActions.setTheme("light"))
                    : storeDispatch(themeActions.setTheme("dark"))
            }
        >
            {theme === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </button>
    );
};

export default DarkModeToggle;
