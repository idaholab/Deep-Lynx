import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

import clsx from "clsx";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Generated by create next app",
};

// THIS LAYOUT IS FOR THE AUTH PAGE AFTER REACHING THE LANDING PAGE

export default async function RootLayout(
    {
        children,
    }: Readonly<{
        children: React.ReactNode;
    }>
) {
    const prefersDark = (await cookies()).get("x-theme")?.value === "dark";
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}