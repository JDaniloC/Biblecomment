"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProfileProvider } from "@/contexts/ProfileContext";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
    },
    secondary: {
      main: "#7c3aed",
    },
  },
  typography: {
    fontFamily: "inherit",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f9fafb",
        },
      },
    },
  },
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <NotificationProvider>
          <ProfileProvider>
            {children}
          </ProfileProvider>
        </NotificationProvider>
      </ThemeProvider>
    </NextAuthSessionProvider>
  );
}
