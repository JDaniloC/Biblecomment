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
        {/*
          JSON exports. Each POSTs back to the same /api/backup/* endpoint.
          Disaster recovery restores them in this order: erasures (so
          deleted accounts stay deleted), users, comments, discussions.
          Restoring is for recovery after data loss, from the latest export:
          a content restore can't tell a lost row from one deleted on
          purpose, so it re-inserts every comment and discussion deleted
          since that export (see BackupUseCases.ts). Accounts deleted after
          the export have their tombstone only in the lost database; each
          deletion is also logged as `account_erased` ({ userId, erasedAt }),
          and those entries are re-posted to /api/backup/erasures before the
          users restore.
        */}
        <p className="text-sm text-gray-600 dark:text-slate-300" data-testid="backup-restore-note">
          A restauração serve para recuperar dados após uma perda e deve usar
          sempre a exportação mais recente: comentários e discussões excluídos
          depois dessa exportação voltariam a aparecer. Ordem de restauração:
          exclusões, usuários, comentários e discussões.
        </p>
        <p className="text-sm text-gray-600 dark:text-slate-300" data-testid="backup-erasures-log-note">
          Antes de restaurar os usuários, reenvie para{" "}
          <code className="text-xs">/api/backup/erasures</code> cada entrada{" "}
          <code className="text-xs">account_erased</code> dos logs mais recente
          que essa exportação (os campos <code className="text-xs">userId</code> e{" "}
          <code className="text-xs">erasedAt</code>). Sem isso, as contas
          excluídas depois da exportação seriam recriadas.
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
          <Link
            href="/api/backup/erasures"
            target="_blank"
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-brand transition"
          >
            <h2 className="font-semibold text-gray-800 dark:text-slate-100">Backup Exclusões</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Exportar o registro de contas excluídas em JSON (restaure-o antes dos usuários)
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
