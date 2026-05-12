"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export { signIn, signOut };

export function useAuth() {
  const { data: session, status } = useSession();
  return {
    session,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    user: session?.user ?? null,
  };
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.includes("next-auth.session-token") ||
    document.cookie.includes("__Secure-next-auth.session-token");
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const result = await signIn("credentials", {
    redirect: false,
    email,
    password,
  });
  return { ok: result?.ok ?? false, error: result?.error ?? undefined };
}

export async function logout(): Promise<void> {
  await signOut({ redirect: false });
}
