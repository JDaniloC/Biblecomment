import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.moderator) redirect("/home");

  const user = session.user;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 dark:border-b dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Painel Admin</h1>
          <Link href="/home" className="text-sm text-blue-600 dark:text-brand hover:underline">
            ← Voltar
          </Link>
        </div>
      </header>
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <p className="text-gray-600 dark:text-slate-300 text-sm">
          Bem-vindo, <strong>{user.name}</strong>.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/api/backup/comments"
            target="_blank"
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-brand transition"
          >
            <h2 className="font-semibold text-gray-800 dark:text-slate-100">Backup Comentários</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Exportar todos os comentários em JSON</p>
          </Link>
          <Link
            href="/api/backup/discussions"
            target="_blank"
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-brand transition"
          >
            <h2 className="font-semibold text-gray-800 dark:text-slate-100">Backup Discussões</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Exportar todas as discussões em JSON</p>
          </Link>
          <Link
            href="/api/backup/users"
            target="_blank"
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-brand transition"
          >
            <h2 className="font-semibold text-gray-800 dark:text-slate-100">Backup Usuários</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Exportar todos os usuários em JSON</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
