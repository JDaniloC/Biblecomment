import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o Bible Comment coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
  robots: { index: true, follow: true },
};

const DPO_EMAIL = "jdsc@cin.ufpe.br";
const EFFECTIVE_DATE = "28 de abril de 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <main
        id="main-content"
        className="max-w-3xl mx-auto px-4 py-10 md:py-14 prose prose-stone dark:prose-invert"
      >
        <p className="text-sm text-stone-600 dark:text-stone-400">
          <Link href="/" className="underline">← Início</Link>
        </p>
        <h1 className="font-lora text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
          Política de Privacidade
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Vigente a partir de {EFFECTIVE_DATE}.
        </p>

        <section className="mt-8 space-y-3 text-stone-700 dark:text-stone-300 leading-relaxed">
          <p>
            Esta política descreve como o Bible Comment trata seus dados
            pessoais, em conformidade com a{" "}
            <strong>Lei Geral de Proteção de Dados (LGPD &mdash; Lei 13.709/2018)</strong>.
            Ao utilizar o serviço, você declara estar ciente das práticas
            descritas abaixo.
          </p>
        </section>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          1. Controlador dos dados
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          O Bible Comment é mantido por colaboradores voluntários, sem fins
          lucrativos. Para fins de LGPD, o canal oficial para requisições de
          titulares é o e-mail{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-blue-700 dark:text-brand underline">
            {DPO_EMAIL}
          </a>
          .
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          2. Dados coletados
        </h2>
        <ul className="list-disc pl-6 text-stone-700 dark:text-stone-300 space-y-1">
          <li>
            <strong>E-mail</strong> &mdash; usado exclusivamente para autenticar
            o login. Nunca enviamos newsletters, marketing ou notificações
            externas para este endereço.
          </li>
          <li>
            <strong>Nome de usuário</strong> público, exibido nos comentários e
            discussões.
          </li>
          <li>
            <strong>Senha</strong>, armazenada como <em>hash</em> bcrypt
            (nunca em texto puro).
          </li>
          <li>
            <strong>Crença e estado</strong> (opcionais), preenchidos no perfil.
            Você pode editar ou apagar a qualquer momento.
          </li>
          <li>
            <strong>Conteúdo gerado</strong> &mdash; comentários, discussões,
            respostas, curtidas e denúncias.
          </li>
          <li>
            <strong>Logs operacionais</strong> &mdash; endereço IP, timestamp e
            agente de usuário para depuração e prevenção de abuso. Retidos
            por até 6 meses.
          </li>
          <li>
            <strong>Assinatura de notificações push</strong> (opcional) &mdash;
            ao ativar o sino de notificações, o navegador gera um{" "}
            <em>endpoint</em> único e um par de chaves públicas que
            armazenamos para entregar avisos de novas respostas, menções, novos
            seguidores e conquistas. A assinatura é removida do servidor quando
            você desativa o toggle ou desinstala o app.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          3. Finalidades do tratamento
        </h2>
        <ul className="list-disc pl-6 text-stone-700 dark:text-stone-300 space-y-1">
          <li>Permitir autenticação e identificação de quem publica conteúdo.</li>
          <li>Operar a plataforma de comentários e discussões.</li>
          <li>Prevenir abuso, spam e violações dos Termos de Uso.</li>
          <li>Atender a obrigações legais quando aplicável.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          4. Bases legais
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          O tratamento se apoia em duas bases legais previstas no art. 7.º da
          LGPD: (i) <strong>execução de contrato</strong> &mdash; necessário
          para prestar o serviço solicitado; e (ii){" "}
          <strong>consentimento</strong> &mdash; expressamente coletado no
          cadastro, podendo ser revogado a qualquer momento pela exclusão da
          conta.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          5. Compartilhamento e processadores
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Não vendemos, alugamos ou compartilhamos seus dados com terceiros
          para fins comerciais. Quando a variável de ambiente{" "}
          <code className="text-sm bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            SENTRY_DSN
          </code>{" "}
          está configurada, mensagens de erro do servidor podem ser enviadas
          ao serviço Sentry para diagnóstico, sem incluir senhas ou tokens.
          Caso esta integração esteja ativa, ela é mencionada aqui de forma
          transparente.
        </p>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed mt-3">
          A entrega de notificações push, quando ativada, atravessa o serviço
          de push do seu navegador &mdash; Google FCM no Chrome/Android, Mozilla
          autopush no Firefox, Apple APNs no Safari. Esses operadores recebem
          apenas o endpoint cifrado e a carga útil mínima (título, corpo curto
          e URL de destino dentro do app). Não enviamos identificadores nem
          conteúdo sensível por esse canal.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          6. Direitos do titular
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Você pode exercer, a qualquer tempo, os direitos previstos no art. 18
          da LGPD:
        </p>
        <ul className="list-disc pl-6 text-stone-700 dark:text-stone-300 space-y-1">
          <li>
            <strong>Acesso e portabilidade</strong> &mdash; baixe um JSON
            completo dos seus dados na aba{" "}
            <Link href="/profile" className="text-blue-700 dark:text-brand underline">
              Perfil
            </Link>
            .
          </li>
          <li>
            <strong>Correção</strong> &mdash; edite e-mail (via suporte), nome,
            crença e estado pelo perfil.
          </li>
          <li>
            <strong>Eliminação</strong> &mdash; ao excluir sua conta o registro
            do usuário é apagado e seus comentários, discussões e respostas
            são anonimizados como &ldquo;[usuário removido]&rdquo;. Notificações
            que mencionam você são removidas.
          </li>
          <li>
            <strong>Revogação do consentimento</strong> &mdash; equivalente à
            exclusão da conta.
          </li>
          <li>
            <strong>Reclamação à ANPD</strong> &mdash; você pode reclamar
            diretamente à Autoridade Nacional de Proteção de Dados.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          7. Cookies e armazenamento local
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Utilizamos apenas cookies/sessões estritamente necessários para o
          funcionamento da autenticação. Preferências de tema (claro/escuro) e
          tamanho de fonte são salvas em <code>localStorage</code> do seu
          navegador e nunca enviadas ao servidor.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          8. Segurança
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Senhas armazenadas com bcrypt, comunicação em HTTPS, validação no
          servidor de todas as entradas de usuários (Zod). Apesar dos
          esforços, nenhum sistema é absolutamente imune &mdash; se identificar
          uma falha, contate{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-blue-700 dark:text-brand underline">
            {DPO_EMAIL}
          </a>
          .
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          9. Alterações desta política
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Mudanças relevantes serão sinalizadas na página inicial e a data de
          vigência acima será atualizada. Mudanças que reduzam direitos do
          titular exigirão novo consentimento ativo.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          10. Contato
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Dúvidas, requisições ou reclamações relativas a privacidade:{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-blue-700 dark:text-brand underline">
            {DPO_EMAIL}
          </a>
          .
        </p>
      </main>
    </div>
  );
}
