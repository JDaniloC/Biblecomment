"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MiniPlayer } from "@/components/AudioPlayer/MiniPlayer";

// Rotas sem app-shell: a barra não deve aparecer.
const DENY = ["/login", "/register", "/offline", "/forgot-password", "/reset-password"];

export function AppShellChrome() {
  const pathname = usePathname();
  const { data } = useSession();
  if (DENY.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  const user = data?.user
    ? { username: (data.user as { username: string }).username }
    : null;
  return (
    <>
      <MiniPlayer />
      <MobileTabBar user={user} />
    </>
  );
}
