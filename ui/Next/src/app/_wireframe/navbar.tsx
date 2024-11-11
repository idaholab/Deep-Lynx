"use client";

// MUI
import { AppBar, Box, Button, Toolbar } from "@mui/material";

// Components
import DarkModeToggle from "./dark-mode-toggle";

// Styles
import { classes } from "../styles";

// Store
import { useAppSelector } from "@/lib/store/hooks";


export default function Navbar() {
  const container = useAppSelector((state) => state.container.container);

  return (
    <>
      <AppBar position="sticky" className={classes.appbar}>
        <Toolbar className={classes.toolbar}>
          <Box
            component={"img"}
            sx={{ height: "75%" }}
            src={"/lynx-white.png"}
            className={classes.logo}
          />
          <Box flexGrow={1} />
          <DarkModeToggle />
        </Toolbar>
      </AppBar>
    </>
  );
}
