"use client";

// Hooks
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetatypes } from "@/lib/context/ContainerProvider";

// MUI
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Toolbar,
  Typography,
} from "@mui/material";

// Icons
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import InsightsIcon from "@mui/icons-material/Insights";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import StyleIcon from "@mui/icons-material/Style";
import SendIcon from "@mui/icons-material/Send";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import LogoutIcon from "@mui/icons-material/Logout";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
type PropsT = {
  drawer: boolean;
  handleDrawer: Function;
};

// Styles
import { classes } from "@/app/styles";

export default function Sidebar(props: PropsT) {
  // Hooks
  const router = useRouter();
  const container = useAppSelector((state) => state.container.container!);

  return (
    <>
      <Drawer
        open={props.drawer}
        onClose={() => props.handleDrawer()}
        classes={{
          paper: classes.sidebar.drawer,
        }}
      >
        <AppBar position="sticky" className={classes.appbar}>
          <Toolbar className={classes.toolbar}>
            <Button
              onClick={() => props.handleDrawer()}
              className={classes.button}
            >
              <MenuIcon className={classes.icon} />
            </Button>
            <Box
              component={"img"}
              sx={{ height: "75%" }}
              src={"/lynx-white.png"}
              className={classes.logo}
            />
          </Toolbar>
        </AppBar>
        <Container className={classes.container}>
          <Box sx={{ width: "100%" }}>
            <Typography variant="overline">DeepLynx</Typography>
            <Divider className={classes.divider} />
            <br />
            <Box>
              <Button
                startIcon={<HomeIcon className={classes.icon} />}
                className={classes.sidebar.button}
                onClick={() => router.push(`/containers/${container.id}`)}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography
                  variant="button"
                  sx={{
                    padding: "0 1rem",
                  }}
                >
                  Dashboard
                </Typography>
              </Button>
            </Box>
            <br />
            <Typography variant="overline">Data</Typography>
            <Divider className={classes.divider} />
            <br />
            <Box>
              <Button
                startIcon={<SearchIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  View
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<ViewInArIcon className={classes.icon} />}
                className={classes.sidebar.button}
                onClick={() =>
                  router.push(`/containers/${container.id}/model-viewer`)
                }
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Model Viewer
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<FilePresentIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Files
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<InsightsIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Reports
                </Typography>
              </Button>
            </Box>
            <br />
            <Typography variant="overline">Data Management</Typography>
            <Divider className={classes.divider} />
            <br />
            <Box>
              <Button
                startIcon={<AccountTreeIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Ontology
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<MoveToInboxIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Data Sources
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<StyleIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Tags
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<SendIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Events
                </Typography>
              </Button>
            </Box>
            <br />
            <Typography variant="overline">User</Typography>
            <Divider className={classes.divider} />
            <br />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <Button
                startIcon={<AccountBoxIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Profile
                </Typography>
              </Button>
            </Box>
            <Box>
              <Button
                startIcon={<LogoutIcon className={classes.icon} />}
                className={classes.sidebar.button}
                sx={{ "& .MuiButton-startIcon": { paddingLeft: "1rem" } }}
              >
                <Typography variant="button" sx={{ padding: "0 1rem" }}>
                  Sign Out
                </Typography>
              </Button>
            </Box>
            <Box
              flexGrow={1}
              sx={{
                display: "flex",
                padding: "2.5rem 0 0 0",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "15vh",
              }}
            >
              <Typography variant="caption">
                Developed by Digital Engineering
              </Typography>
            </Box>
          </Box>
        </Container>
      </Drawer>
    </>
  );
}
