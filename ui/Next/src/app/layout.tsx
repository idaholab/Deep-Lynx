import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import StoreProvider from "@/lib/context/StoreProvider";
import ThemeProvider from "@/lib/context/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

// Components
import Wireframe from "@/app/_wireframe/wireframe";

export const metadata: Metadata = {
  title: "DeepLynx",
  description:
    "A data warehouse, for digital engineering. Developed at the Idaho National Laboratory.",
};

// THIS LAYOUT IS FOR THE LANDING PAGE BEFORE AUTHENTICATION (WHEN USER NOT AUTHENTICATED)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StoreProvider>
      <ThemeProvider>
        {/* <Wireframe>{children}</Wireframe> */}
        {children}
      </ThemeProvider>
    </StoreProvider>
  );
}