"use client";

// Hooks
import { useState } from "react";

// MUI
import { AppBar, Button, Toolbar } from "@mui/material";

// Icons
import MenuIcon from "@mui/icons-material/Menu";

import {
    ChevronDownIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import Image from "next/image";
import DarkModeToggle from "./dark-mode-toggle";

type PropsT = {
    handleDrawer: Function;
};

export default function Navbar(props: PropsT) {
    return (
        <>
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
                        onClick={() => {
                            props.handleDrawer();
                        }}
                        sx={{ color: "white" }}
                    >
                        <MenuIcon />
                    </Button>
                </Toolbar>
            </AppBar>
        </>
    );
}
