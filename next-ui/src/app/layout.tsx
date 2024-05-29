import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";

// Providers
import StoreProvider from "./StoreProvider";

const inter = Inter({ subsets: ["latin"] });

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
    const prefersDark = cookies().get("x-theme")?.value === "dark";
    return (
        <StoreProvider>
            <html lang="en">
                <body>{children}</body>
            </html>
        </StoreProvider>
    );
}
