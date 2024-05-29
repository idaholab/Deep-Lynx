"use client";

// Components
import Wireframe from "@/app/_components/wireframe";

// Providers
import ContainerProvider from "@/lib/context/ContainerProvider";

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
    return (
        <ContainerProvider>
            <Wireframe>{children}</Wireframe>
        </ContainerProvider>
    );
}
