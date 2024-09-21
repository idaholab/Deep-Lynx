"use client";

// MUI
import { AppBar, Box, Button, Toolbar } from "@mui/material";

// Icons
import MenuIcon from "@mui/icons-material/Menu";

// Components
import DarkModeToggle from "./dark-mode-toggle";

// Styles
import { Styles } from "@/lib/theme/styles";

// Store
import { useAppSelector } from "@/lib/store/hooks";

type PropsT = {
  handleDrawer: Function;
};

export default function Navbar(props: PropsT) {
  const container = useAppSelector((state) => state.container.container);

  return (
    <>
      <AppBar position="sticky" sx={Styles.Navbar.Appbar}>
        <Toolbar sx={Styles.Navbar.Toolbar}>
          {container ? (
            <Button
              onClick={() => {
                props.handleDrawer();
              }}
              sx={{ color: "white" }}
            >
              <MenuIcon />
            </Button>
          ) : null}
          <Box
            component={"img"}
            sx={{ height: "75%" }}
            src={"/lynx-white.png"}
          />
          <Box flexGrow={1} />
          <DarkModeToggle />
        </Toolbar>
      </AppBar>
    </>
  );
}
