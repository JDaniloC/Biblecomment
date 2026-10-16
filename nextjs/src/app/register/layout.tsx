import type { Metadata } from "next";

// page.tsx is a client component, so its metadata has to come from this
// segment layout. robots.ts disallows /register as well, and next.config.js
// sends a matching X-Robots-Tag header.
export const metadata: Metadata = {
  title: "Criar conta",
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
