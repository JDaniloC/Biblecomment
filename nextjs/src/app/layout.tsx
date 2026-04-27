import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./providers";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:5000"),
  title: {
    default: "Bible Comment — Sua Biblioteca Bíblica",
    template: "%s | Bible Comment",
  },
  description:
    "Compartilhe a mensagem de Deus com seus irmãos. 30.000+ versículos para estudo, comentário e discussão.",
  applicationName: "Bible Comment",
  keywords: ["bíblia", "versículo", "comentário", "exegese", "devocional", "estudo bíblico"],
  authors: [{ name: "Bible Comment" }],
  openGraph: {
    title: "Bible Comment",
    description: "Sua biblioteca bíblica para estudo, comentário e discussão.",
    type: "website",
    locale: "pt_BR",
    siteName: "Bible Comment",
  },
  twitter: {
    card: "summary",
    title: "Bible Comment",
    description: "Sua biblioteca bíblica para estudo, comentário e discussão.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={lora.variable}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
