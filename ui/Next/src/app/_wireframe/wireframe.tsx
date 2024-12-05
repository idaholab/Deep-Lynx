"use client";

// Hooks
import { usePathname } from "next/navigation";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { uxActions } from "@/lib/store/features/ux/uxSlice";

// Components
import Sidebar from "./sidebar";
import Navbar from "./navbar2";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function Wireframe({children}: Props) {

  return (
    <>
      <Navbar/>
      <Sidebar>{children}</Sidebar>
    
    </>
  );
}
