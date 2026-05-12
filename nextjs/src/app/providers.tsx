"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <NotificationProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </NotificationProvider>
      </NextThemesProvider>
    </NextAuthSessionProvider>
  );
}
