// Components
import Wireframe from "@/app/components/wireframe";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    /**
     * This layout is presented after the user has selected a container, and as such, wraps the UX in the wireframe (sidebar and navbar)
     */
    return <Wireframe>{children}</Wireframe>;
}
