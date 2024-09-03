"use client";

// Hooks
import { useState } from "react";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { uxActions } from "@/lib/store/features/ux/uxSlice";

// Components
import Sidebar from "./sidebar";
import Navbar from "./navbar";

export default function Wireframe(props: any) {
  const drawer: boolean = useAppSelector((state) => state.ux.drawer);

  const storeDispatch = useAppDispatch();

  // Handlers
  const handleDrawer = () => {
    storeDispatch(uxActions.drawer(!drawer));
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
