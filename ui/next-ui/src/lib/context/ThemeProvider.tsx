"use client";

// Hooks
import { useAppSelector } from "@/lib/store/hooks";

// Providers
import { ThemeProvider as MUITheme } from "@mui/material/styles";

// Styles
import { StyledEngineProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { lightTheme, darkTheme } from "@/lib/theme/themes";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useAppSelector((state) => state.theme.theme);

  return (
    <MUITheme theme={theme === "light" ? lightTheme : darkTheme}>
      <CssBaseline />
      <StyledEngineProvider injectFirst>{children}</StyledEngineProvider>
    </MUITheme>
  );
}
