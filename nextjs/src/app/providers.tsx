"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb" },
    secondary: { main: "#7c3aed" },
  },
  typography: { fontFamily: "inherit" },
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <MuiThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          <NotificationProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </NotificationProvider>
        </MuiThemeProvider>
      </NextThemesProvider>
    </NextAuthSessionProvider>
  );
}
