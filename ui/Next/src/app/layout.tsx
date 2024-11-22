import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import StoreProvider from "@/lib/context/StoreProvider";

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
    <html className="bg-white">
    <body>
    <StoreProvider>
        {/* <Wireframe>{children}</Wireframe> */}
        {children}
    </StoreProvider>
    </body>
    </html>
  );
}
