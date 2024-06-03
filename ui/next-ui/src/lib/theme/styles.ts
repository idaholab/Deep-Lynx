// Colors
import { blueGrey, grey } from "@mui/material/colors";

export const Styles = {
    Navbar: {
        Appbar: {
            color: "white",
            height: "7.5vh",
            display: "flex",
            justifyContent: "center",
        },
        Button: {
            color: grey[200],
        },
        Toolbar: {
            height: "100%",
            padding: 0,
            backgroundColor: grey[900],
        },
    },
    Sidebar: {
        Button: {
            light: {
                color: blueGrey[900],
                width: "100%",
                justifyContent: "start",
                "&:hover": {
                    color: grey[50],
                    backgroundColor: grey[500],
                },
            },
            dark: {
                color: blueGrey[100],
                width: "100%",
                justifyContent: "start",
                "&:hover": {
                    color: grey[50],
                    backgroundColor: grey[500],
                },
            },
        },
        Divider: {
            borderColor: grey[50],
        },
        Drawer: {
            light: {
                width: "15vw",
                minWidth: "325px",
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: "15vw",
                    minWidth: "325px",
                    boxSizing: "border-box",
                    backgroundColor: grey[400],
                },
            },
            dark: {
                width: "15vw",
                minWidth: "325px",
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: "15vw",
                    minWidth: "325px",
                    boxSizing: "border-box",
                    backgroundColor: grey[900],
                },
            },
        },
        Header: {
            light: {
                color: "black",
            },
            dark: {
                color: "white",
            },
        },
    },
};
