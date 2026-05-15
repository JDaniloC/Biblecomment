import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sem conexão",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="min-h-[100dvh] flex items-center justify-center px-6 py-16 text-center"
    >
      <div className="max-w-md">
        <h1 className="font-serif text-3xl text-brand mb-3">Sem conexão</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Você está offline no momento. Conecte-se à internet para continuar
          lendo, comentando e estudando.
        </p>
        <Link
          href="/"
          className="inline-block bg-brand text-white px-5 py-2.5 rounded-md font-medium hover:opacity-90"
        >
          Tentar novamente
        </Link>
      </div>
    </main>
  );
}
