"use client";

// Hooks
import { createContext, useContext } from "react";

// Components
import Wireframe from "@/app/_components/wireframe";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { Context } from "react";
import { ContainerT } from "@/lib/types";

let ContainerContext: Context<ContainerT> = createContext<ContainerT>(
    {} as ContainerT
);

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    /**
     * This layout is presented after the user has selected a container,
     * and as such, wraps the UX in the container context,
     * and the wireframe (sidebar and navbar)
     */
    const container: ContainerT = useAppSelector(
        (state) => state.container.container!
    );
    ContainerContext = createContext(container);

    return (
        <ContainerContext.Provider value={container}>
            <Wireframe>{children}</Wireframe>
        </ContainerContext.Provider>
    );
}

// Export the custom useContainer hook, allowing all child components to access the container
export const useContainer = () => useContext(ContainerContext);
