import type { Metadata } from "next";

// page.tsx is a client component, so its metadata has to come from this
// segment layout. It also covers every /login?callbackUrl=... variant (same
// route segment). robots.ts disallows /login as well, and next.config.js
// sends a matching X-Robots-Tag header.
export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
