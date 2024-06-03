"use client";

// React
import React from "react";

// Hooks
import { useState } from "react";

// MUI
import { Button } from "@mui/material";

// Icons
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

// Store
import { useAppDispatch } from "@/lib/store/hooks";
import { themeActions } from "@/lib/store/features/themeSlice";
import { useTheme } from "../../lib/context/ThemeProvider";

import { Styles } from "@/lib/theme/styles";

const DarkModeToggle = () => {
    const theme = useTheme();
    const storeDispatch = useAppDispatch();

    // Handlers
    const handleTheme = () => {
        theme === "light"
            ? storeDispatch(themeActions.setTheme("dark"))
            : storeDispatch(themeActions.setTheme("light"));
    };

    return (
        <Button sx={Styles.Navbar.Button} onClick={handleTheme}>
            {theme === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </Button>
    );
};

export default DarkModeToggle;
