import '../styles/globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ThemeToggle } from '../components/ThemeToggle';

export const metadata: Metadata = {
  title: {
    default: 'Biblecomment',
    template: '%s · Biblecomment',
  },
  description: 'Comentários bíblicos, buscas e discussões.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto max-w-5xl p-4">{children}</main>
        <footer className="border-t py-6 text-center text-sm text-gray-500">
          Biblecomment © {new Date().getFullYear()}
        </footer>
        <ScriptToSetInitialTheme />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur dark:bg-gray-900/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          Biblecomment
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/livros">Livros</Link>
          <Link href="/busca">Busca</Link>
          <Link href="/ajuda">Ajuda</Link>
          <Link href="/perfil">Perfil</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function ScriptToSetInitialTheme() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var stored = localStorage.getItem('bc-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();`,
      }}
    />
  );
}
