"use client";

import React, { createContext, useContext } from "react";
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { ContainerT } from "../types";

let ContainerContext = createContext<ContainerT>({} as ContainerT);

export default function ContainerProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const container: ContainerT = useAppSelector(
        (state) => state.container.container!
    );
    ContainerContext = createContext(container);

    return (
        <ContainerContext.Provider value={container}>
            {children}
        </ContainerContext.Provider>
    );
}

// Custom hook to use the ThemeContext
export const useContainer = () => useContext(ContainerContext);
