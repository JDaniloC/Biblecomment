import type { Metadata } from "next";
import { Inter, Lora, Merriweather } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./providers";

// Inter: app default sans (was inlined in 50+ places as a fontFamily
// string). Loaded once here and applied via the body className so
// inline overrides become unnecessary.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Merriweather: serif used for verse quotes.
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

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
    <html
      lang="pt-BR"
      className={`${inter.variable} ${merriweather.variable} ${lora.variable}`}
    >
      <body className="font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
