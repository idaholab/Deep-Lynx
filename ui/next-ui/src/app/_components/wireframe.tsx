"use client";

// Hooks
import { useState } from "react";

// Components
import Sidebar from "./sidebar";
import Navbar from "./navbar";

export default function Wireframe(props: any) {
    const [drawer, setDrawer] = useState(true);

    // Handlers
    const handleDrawer = () => {
        setDrawer(!drawer);
    };

    return (
        <>
            <Navbar handleDrawer={handleDrawer} />
            <Sidebar drawer={drawer} handleDrawer={handleDrawer} />
            <main className="py-10">
                <div className="px-4 sm:px-6 lg:px-8">{props.children}</div>
            </main>
        </>
    );
}
