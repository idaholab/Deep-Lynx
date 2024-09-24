"use client";

// MUI
import { AppBar, Box, Button, Toolbar } from "@mui/material";

// Icons
import MenuIcon from "@mui/icons-material/Menu";

// Components
import DarkModeToggle from "./dark-mode-toggle";

// Styles
import { classes } from "../styles";

// Store
import { useAppSelector } from "@/lib/store/hooks";

type PropsT = {
  handleDrawer: Function;
};

export default function Navbar(props: PropsT) {
  const container = useAppSelector((state) => state.container.container);

  return (
    <>
      <AppBar position="sticky" className={classes.appbar}>
        <Toolbar className={classes.toolbar}>
          {container ? (
            <Button
              onClick={() => {
                props.handleDrawer();
              }}
              className={classes.button}
            >
              <MenuIcon className={classes.icon} />
            </Button>
          ) : null}
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
