"use client";

// Components
import Wireframe from "@/app/_wireframe/wireframe";

// Providers
import ContainerProvider from "@/lib/context/ContainerProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * This layout is presented after the user has selected a container,
   * and as such, wraps the UX in the application's contexts,
   * and the wireframe (sidebar and navbar)
   */
  return (
    <ContainerProvider>
      <Wireframe>{children}</Wireframe>
    </ContainerProvider>
  );
}
