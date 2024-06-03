"use client";

import React, { createContext, useContext } from "react";
import { useAppSelector } from "@/lib/store/hooks";

let ThemeContext = createContext<string>("");

export default function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const theme = useAppSelector((state) => state.theme.theme);
    ThemeContext = createContext(theme);

    return (
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    );
}

// Custom hook to use the ThemeContext
export const useTheme = () => useContext(ThemeContext);
