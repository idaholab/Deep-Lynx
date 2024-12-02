"use client";

// Hooks
import { usePathname } from "next/navigation";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { uxActions } from "@/lib/store/features/ux/uxSlice";

// Components
import Sidebar from "./sidebar";
import Navbar from "./navbar2";

export default function Wireframe(props: any) {
  const container = useAppSelector((state) => state.container.container);
  const drawer: boolean = useAppSelector((state) => state.ux.drawer);
  const path = usePathname();

  const storeDispatch = useAppDispatch();

  return (
    <>
      <Navbar/>
      <Sidebar/>
      {props.children}
    </>
  );
}
