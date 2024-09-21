"use client";

// MUI
import { Toolbar } from "@mui/material";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { uxActions } from "@/lib/store/features/ux/uxSlice";

// Components
import Sidebar from "./sidebar";
import Navbar from "./navbar";

export default function Wireframe(props: any) {
  const container = useAppSelector((state) => state.container.container);
  const drawer: boolean = useAppSelector((state) => state.ux.drawer);

  const storeDispatch = useAppDispatch();

  // Handlers
  const handleDrawer = () => {
    storeDispatch(uxActions.drawer(!drawer));
  };

  return (
    <>
      <Navbar handleDrawer={handleDrawer} />
      {container ? (
        <Sidebar drawer={drawer} handleDrawer={handleDrawer} />
      ) : null}
      {props.children}
    </>
  );
}
