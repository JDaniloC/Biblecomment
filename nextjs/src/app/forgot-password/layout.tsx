import type { Metadata } from "next";

// page.tsx is a client component, so its metadata has to come from this
// segment layout. Auth utility page — keep it out of the index.
export const metadata: Metadata = {
  title: "Recuperar senha",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
