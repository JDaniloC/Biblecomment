import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos e condições para uso do Bible Comment.",
  robots: { index: true, follow: true },
};

const DPO_EMAIL = "jdsc@cin.ufpe.br";
const EFFECTIVE_DATE = "28 de abril de 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950">
      <main
        id="main-content"
        className="max-w-3xl mx-auto px-4 py-10 md:py-14"
      >
        <p className="text-sm text-stone-600 dark:text-stone-400">
          <Link href="/" className="underline">← Início</Link>
        </p>
        <h1 className="font-lora text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100">
          Termos de Uso
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">
          Vigente a partir de {EFFECTIVE_DATE}.
        </p>

        <section className="space-y-3 text-stone-700 dark:text-stone-300 leading-relaxed">
          <p>
            Ao criar uma conta ou utilizar o Bible Comment, você concorda com
            os termos abaixo. Leia com atenção; se discordar de algum ponto,
            não utilize o serviço.
          </p>
        </section>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          1. Sobre o serviço
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          O Bible Comment é uma plataforma comunitária para leitura,
          comentário e discussão de versículos bíblicos. Todo o conteúdo
          textual da Bíblia exibido vem de fontes públicas; os comentários e
          discussões são produzidos por usuários cadastrados.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          2. Cadastro e conta
        </h2>
        <ul className="list-disc pl-6 text-stone-700 dark:text-stone-300 space-y-1">
          <li>É necessário ter pelo menos 13 anos para criar uma conta.</li>
          <li>
            Você é responsável pelas credenciais e por todas as atividades
            realizadas em sua conta.
          </li>
          <li>
            Apenas uma conta por pessoa. Múltiplas contas podem ser
            removidas pelos moderadores.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          3. Conduta esperada
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Comentários, discussões e respostas devem se manter no espírito do
          projeto: edificar e enriquecer o estudo bíblico. <strong>Não é
          permitido</strong>:
        </p>
        <ul className="list-disc pl-6 text-stone-700 dark:text-stone-300 space-y-1">
          <li>Conteúdo difamatório, ofensivo, racista, sexista ou violento.</li>
          <li>Spam, propaganda comercial ou correntes.</li>
          <li>
            Conteúdo desconectado do versículo ou capítulo (interjeições
            isoladas, &ldquo;teste&rdquo;, etc.).
          </li>
          <li>
            Plágio sem atribuição. Ao publicar comentários de teólogos ou
            pastores, cite a fonte.
          </li>
          <li>
            Coleta automatizada (scraping) sem autorização prévia por escrito.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          4. Moderação
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Comentários podem ser denunciados por qualquer usuário. Moderadores
          podem remover conteúdos ou suspender contas que violem estes Termos.
          Decisões podem ser revistas por contato em{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-blue-700 dark:text-brand underline">
            {DPO_EMAIL}
          </a>
          .
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          5. Propriedade intelectual
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Você mantém os direitos sobre o conteúdo que publica e concede ao
          Bible Comment uma licença não-exclusiva, gratuita e mundial para
          exibir esse conteúdo dentro da plataforma. Ao excluir sua conta os
          textos são anonimizados (atribuídos a &ldquo;[usuário removido]&rdquo;)
          mas permanecem visíveis para preservar o contexto das discussões.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          6. Isenção de responsabilidade
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          O serviço é oferecido &ldquo;como está&rdquo;, sem garantias de
          disponibilidade contínua, ausência de erros ou aderência a qualquer
          interpretação teológica. Comentários publicados são opiniões dos
          autores e não refletem posicionamento oficial dos mantenedores.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          7. Privacidade
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Seus dados pessoais são tratados conforme a{" "}
          <Link href="/privacy" className="text-blue-700 dark:text-brand underline">
            Política de Privacidade
          </Link>
          , parte integrante destes Termos.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          8. Encerramento
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Você pode excluir sua conta a qualquer momento, na aba{" "}
          <Link href="/profile" className="text-blue-700 dark:text-brand underline">Perfil</Link>.
          Os mantenedores podem encerrar contas que violem estes Termos,
          comunicando o motivo ao e-mail cadastrado quando possível.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          9. Lei aplicável e foro
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Estes Termos são regidos pelas leis da República Federativa do
          Brasil. Eventuais litígios serão dirimidos no foro da comarca do
          mantenedor, ressalvado o direito do consumidor ao foro do seu
          domicílio quando aplicável.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-stone-800 dark:text-stone-100">
          10. Alterações
        </h2>
        <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
          Estes Termos podem ser atualizados. Mudanças relevantes serão
          comunicadas na página inicial; o uso continuado após a comunicação
          implica aceitação. Contato:{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-blue-700 dark:text-brand underline">
            {DPO_EMAIL}
          </a>
          .
        </p>
      </main>
    </div>
  );
}
