"use client";

// MUI
import { AppBar, Box, Button, Toolbar } from "@mui/material";

// Icons
import MenuIcon from "@mui/icons-material/Menu";

// Components
import DataSourceSelector from "../(main)/containers/[containerID]/dashboard/components/data-viewer/dataSources/selectDataSource";
import DarkModeToggle from "./dark-mode-toggle";

// Styles
import { Styles } from "@/lib/theme/styles";

type PropsT = {
  handleDrawer: Function;
};

export default function Navbar(props: PropsT) {
  return (
    <>
      <AppBar position="sticky" sx={Styles.Navbar.Appbar}>
        <Toolbar sx={Styles.Navbar.Toolbar}>
          <Button
            onClick={() => {
              props.handleDrawer();
            }}
            sx={{ color: "white" }}
          >
            <MenuIcon />
          </Button>
          <Box flexGrow={1} />
          <DarkModeToggle />
        </Toolbar>
      </AppBar>
    </>
  );
}
