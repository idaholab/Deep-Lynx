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

export default function Sidebar(props: PropsT) {
    // Hooks
    const router = useRouter();
    const container: ContainerT = useAppSelector(
        (state) => state.container.container!
    );

    return (
        <>
            <Drawer
                open={props.drawer}
                onClose={() => props.handleDrawer()}
                sx={{
                    width: "15vw",
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: "15vw",
                        boxSizing: "border-box",
                    },
                }}
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
                    <Toolbar
                        sx={{
                            height: "100%",
                            padding: 0,
                            backgroundColor: "black",
                        }}
                    >
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
                        display: "flex",
                        alignItems: "center",
                        minHeight: "80vh",
                    }}
                >
                    <Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <HomeIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Dashboard
                                </Typography>
                            </Button>
                        </Box>
                        <Divider />
                        <br />
                        <Typography variant="subtitle1">Data</Typography>
                        <Divider />
                        <br />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <SearchIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    View
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                                onClick={() =>
                                    router.push(
                                        `/containers/${container.id}/model-viewer`
                                    )
                                }
                            >
                                <ViewInArIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Model Viewer
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <FilePresentIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Files
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <InsightsIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Reports
                                </Typography>
                            </Button>
                        </Box>
                        <br />
                        <Typography variant="subtitle1">
                            Data Management
                        </Typography>
                        <Divider />
                        <br />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <AccountTreeIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Ontology
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <MoveToInboxIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Data Sources
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <StyleIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Tags
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <SendIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Events
                                </Typography>
                            </Button>
                        </Box>
                        <br />
                        <Typography variant="subtitle1">User</Typography>
                        <Divider />
                        <br />
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <AccountBoxIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Profile
                                </Typography>
                            </Button>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                sx={{ width: "100%", justifyContent: "start" }}
                            >
                                <LogoutIcon />
                                <Typography
                                    variant="subtitle1"
                                    sx={{ padding: "0 1.5rem" }}
                                >
                                    Sign Out
                                </Typography>
                            </Button>
                        </Box>
                    </Box>
                </Container>
            </Drawer>
        </>
    );
}
