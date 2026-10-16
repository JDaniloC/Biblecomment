import type { Metadata } from "next";

// page.tsx is a client component, so its metadata has to come from this
// segment layout. Auth utility page whose URL carries a one-time token —
// keep it out of the index.
export const metadata: Metadata = {
  title: "Redefinir senha",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
