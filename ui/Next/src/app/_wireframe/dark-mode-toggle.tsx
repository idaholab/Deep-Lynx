"use client";

// React
import React from "react";

// MUI
import { Button } from "@mui/material";

// Icons
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { themeActions } from "@/lib/store/features/ux/themeSlice";

import { classes } from "@/app/styles";

const DarkModeToggle = () => {
  const theme = useAppSelector((state) => state.theme.theme);
  const storeDispatch = useAppDispatch();

  // Handlers
  const handleTheme = () => {
    theme === "light"
      ? storeDispatch(themeActions.setTheme("dark"))
      : storeDispatch(themeActions.setTheme("light"));
  };

  return (
    <Button onClick={handleTheme} className={classes.button}>
      {theme === "light" ? (
        <DarkModeIcon className={classes.icon} />
      ) : (
        <LightModeIcon className={classes.icon} />
      )}
    </Button>
  );
};

export default DarkModeToggle;
