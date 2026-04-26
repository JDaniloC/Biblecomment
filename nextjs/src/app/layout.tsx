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
  title: "Bible Comment",
  description: "Compartilhe a mensagem de Deus com seus irmãos",
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
