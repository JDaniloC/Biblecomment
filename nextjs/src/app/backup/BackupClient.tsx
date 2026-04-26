"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import axios from "axios";
import { useNotification } from "@/contexts/NotificationContext";

interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

export default function BackupClient({ user }: { user: SessionUser }) {
  const { handleNotification } = useNotification();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get("/api/backup", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      handleNotification("success", "Backup exportado com sucesso!");
    } catch {
      handleNotification("error", "Erro ao exportar backup.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Importar o backup irá substituir os dados existentes. Continuar?")) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await axios.post("/api/backup", data);
      handleNotification("success", "Backup importado com sucesso!");
    } catch {
      handleNotification("error", "Erro ao importar backup. Verifique o arquivo.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/home" className="text-blue-600 hover:text-blue-800 text-sm">← Livros</Link>
          <h1 className="font-semibold text-gray-800">Backup</h1>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-red-500 hover:text-red-700">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Exportar Dados</h2>
            <p className="text-sm text-gray-600 mb-4">
              Exporte todos os dados do sistema (usuários, comentários, discussões, versículos) em formato JSON.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {exporting ? "Exportando..." : "Exportar Backup"}
            </button>
          </div>

          <hr className="border-gray-200" />

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Importar Dados</h2>
            <p className="text-sm text-gray-600 mb-4">
              Importe um arquivo de backup JSON. <strong>Atenção:</strong> isso substituirá todos os dados atuais.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:rounded-lg file:text-sm file:bg-white hover:file:bg-gray-50"
            />
            {importing && <p className="text-sm text-blue-600 mt-2">Importando...</p>}
          </div>
        </div>

        {user.moderator && (
          <div className="mt-4 text-xs text-gray-400 text-center">
            Acesso de moderador: {user.email}
          </div>
        )}
      </main>
    </div>
  );
}
