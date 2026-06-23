"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <NotificationProvider>
          <ConfirmProvider>
            <AudioPlayerProvider>{children}</AudioPlayerProvider>
          </ConfirmProvider>
        </NotificationProvider>
      </NextThemesProvider>
    </NextAuthSessionProvider>
  );
}
