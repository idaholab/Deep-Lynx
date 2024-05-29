"use client";

// Hooks
import { useRouter } from "next/navigation";

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
import { ContainerT } from "@/lib/types";
type PropsT = {
    drawer: boolean;
    handleDrawer: Function;
};

// Styles
import { Styles } from "@/lib/theme/styles";

// Theme
import { useTheme } from "../../lib/context/ThemeProvider";

export default function Sidebar(props: PropsT) {
    // Hooks
    const router = useRouter();
    const container: ContainerT = useAppSelector(
        (state) => state.container.container!
    );
    const theme = useTheme();

    return (
        <>
            <Drawer
                open={props.drawer}
                onClose={() => props.handleDrawer()}
                sx={
                    theme === "light"
                        ? Styles.Sidebar.Drawer.light
                        : Styles.Sidebar.Drawer.dark
                }
            >
                <AppBar
                    position="sticky"
                    sx={{
                        color: "white",
                        height: "7.5vh",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Toolbar sx={Styles.Navbar.Toolbar}>
                        <Button
                            onClick={() => props.handleDrawer()}
                            sx={{ color: "white" }}
                        >
                            <MenuIcon />
                        </Button>
                    </Toolbar>
                </AppBar>
                <Container
                    sx={{
                        padding: "1rem",
                        display: "flex",
                        alignItems: "center",
                        flexGrow: 1,
                    }}
                >
                    <Box sx={{ width: "100%" }}>
                        <Typography
                            sx={
                                theme === "light"
                                    ? Styles.Sidebar.Header.light
                                    : Styles.Sidebar.Header.dark
                            }
                            variant="overline"
                        >
                            DeepLynx
                        </Typography>
                        <Divider sx={Styles.Sidebar.Divider} />
                        <br />
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<HomeIcon />}
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
                        <Typography
                            sx={
                                theme === "light"
                                    ? Styles.Sidebar.Header.light
                                    : Styles.Sidebar.Header.dark
                            }
                            variant="overline"
                        >
                            Data
                        </Typography>
                        <Divider sx={Styles.Sidebar.Divider} />
                        <br />
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<SearchIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    View
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<ViewInArIcon />}
                                onClick={() =>
                                    router.push(
                                        `/containers/${container.id}/model-viewer`
                                    )
                                }
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Model Viewer
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<FilePresentIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Files
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<InsightsIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Reports
                                </Typography>
                            </Button>
                        </Box>
                        <br />
                        <Typography
                            sx={
                                theme === "light"
                                    ? Styles.Sidebar.Header.light
                                    : Styles.Sidebar.Header.dark
                            }
                            variant="overline"
                        >
                            Data Management
                        </Typography>
                        <Divider sx={Styles.Sidebar.Divider} />
                        <br />
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<AccountTreeIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Ontology
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<MoveToInboxIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Data Sources
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<StyleIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Tags
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<SendIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Events
                                </Typography>
                            </Button>
                        </Box>
                        <br />
                        <Typography
                            sx={
                                theme === "light"
                                    ? Styles.Sidebar.Header.light
                                    : Styles.Sidebar.Header.dark
                            }
                            variant="overline"
                        >
                            User
                        </Typography>
                        <Divider sx={Styles.Sidebar.Divider} />
                        <br />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<AccountBoxIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
                                    Profile
                                </Typography>
                            </Button>
                        </Box>
                        <Box>
                            <Button
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Button.light
                                        : Styles.Sidebar.Button.dark
                                }
                                startIcon={<LogoutIcon />}
                            >
                                <Typography
                                    variant="button"
                                    sx={{ padding: "0 1rem" }}
                                >
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
                            <Typography
                                sx={
                                    theme === "light"
                                        ? Styles.Sidebar.Header.light
                                        : Styles.Sidebar.Header.dark
                                }
                                variant="caption"
                            >
                                Developed by Digital Engineering
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Drawer>
        </>
    );
}
