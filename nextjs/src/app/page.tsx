import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import BooksIndex from "@/components/BooksIndex/BooksIndex";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { connectToDatabase } from "@/infrastructure/database/connection";
import OmniSearch from "./_components/OmniSearch";
import type { Book } from "@/domain/entities/Book";
import type { Verse } from "@/domain/entities/Verse";
import type { Comment } from "@/domain/entities/Comment";

async function getPageData(): Promise<{
  books: Book[];
  verse: Verse | null;
  comment: Comment | null;
}> {
  try {
    await connectToDatabase();

    const bookRepo  = new MongoBookRepository();
    const verseRepo = new MongoVerseRepository();
    const commRepo  = new MongoCommentRepository();

    const today       = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const dayOfYear   = Math.floor((today.getTime() - startOfYear.getTime()) / 86400000);

    const [books, comment] = await Promise.all([
      bookRepo.findAll(),
      commRepo.findDailyFeatured(dayOfYear),
    ]);

    let verse: Verse | null = null;
    if (comment?.verseId) {
      verse = await verseRepo.findById(comment.verseId);
    }

    return { books, verse, comment };
  } catch {
    return { books: [], verse: null, comment: null };
  }
}

function formatReference(verse: Verse): string {
  if (verse.reference) return verse.reference;
  return `${verse.abbrev.toUpperCase()} ${verse.chapter}:${verse.verseNumber}`;
}

const COMMENT_TYPES = [
  {
    icon: "/assets/hand.svg",
    label: "Devocional",
    color: "from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-900/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    description:
      "Um ensinamento extraído do texto, trazendo uma aplicação prática para a vida.",
  },
  {
    icon: "/assets/book.svg",
    label: "Exegético",
    color: "from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/20 border-teal-200 dark:border-teal-900/40",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    description:
      "Estudo da língua original, cultura, curiosidades e referências de teólogos.",
  },
  {
    icon: "/assets/person.svg",
    label: "Pessoal",
    color: "from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-900/40",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    description:
      "Quando o verso tocou a pessoa em algum momento da vida e ela queira relatar.",
  },
  {
    icon: "/assets/pen.svg",
    label: "Inspirado",
    color: "from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/20 border-violet-200 dark:border-violet-900/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    description:
      "Comentários de algum profeta inspirado, canônico ou não.",
  },
];

const ACTIONS = [
  {
    icon: "/assets/heart.svg",
    title: "Favoritar",
    description:
      "O coração marca um comentário como favorito. Você o encontra direto na aba dedicada do seu perfil, sem precisar procurar de novo.",
  },
  {
    icon: "/assets/chat.svg",
    title: "Discutir",
    description:
      "Discorda de uma interpretação? Abra um tópico de discussão para que a comunidade possa explorar o sentido do texto em conjunto.",
  },
  {
    icon: "/assets/warning.svg",
    title: "Reportar",
    description:
      "Reporte comentários que tenham objetivo de ofender, estejam totalmente desconectados do capítulo, ou sejam só interjeições.",
  },
];

export default async function RootPage() {
  const [session, { books, verse, comment }] = await Promise.all([
    auth(),
    getPageData(),
  ]);

  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-950 flex flex-col">
      <Header />

      {!isLoggedIn && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Crie uma conta gratuita para comentar, favoritar versículos e participar dos debates.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/login"
                className="text-sm font-medium text-amber-900 dark:text-amber-200 hover:underline"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 transition"
              >
                Cadastrar-se
              </Link>
            </div>
          </div>
        </div>
      )}

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-white to-stone-50 dark:from-slate-900 dark:to-slate-950 pt-12 md:pt-16 pb-10 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
            <h1 className="font-lora text-4xl md:text-5xl font-bold text-stone-800 dark:text-stone-100 tracking-tight leading-tight">
              Sua Biblioteca Bíblica
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-lg md:text-xl">
              30.000+ versículos · Comentários · Reflexões
            </p>
            <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base max-w-xl mx-auto pt-2">
              Um espaço para o ensino e propagação do livro sagrado cristão através do
              compartilhamento de comentários e interpretações da comunidade.
            </p>
          </div>
          <OmniSearch />
        </section>

        {/* Versículo do Dia */}
        {verse && (
          <section className="px-4 pb-12">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
                <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                  Versículo do Dia
                </span>
                <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 md:p-8 shadow-sm">
                <blockquote className="font-lora text-xl md:text-2xl leading-relaxed text-stone-800 dark:text-stone-100 mb-4">
                  &ldquo;{verse.text}&rdquo;
                </blockquote>
                <cite className="block text-sm font-semibold text-amber-700 dark:text-amber-300 not-italic mb-5">
                  — {formatReference(verse)}
                </cite>

                {comment && (
                  <div className="border-t border-amber-200 dark:border-amber-900/40 pt-4">
                    <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold mb-2">
                      {comment.tags.includes("exegetico")
                        ? "Comentário Exegético"
                        : comment.tags.includes("devocional")
                        ? "Comentário Devocional"
                        : "Comentário em destaque"}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-4">
                      {comment.text}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">por {comment.username}</p>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-4 flex-wrap">
                  <Link
                    href={`/verses/${verse.abbrev}/${verse.chapter}#${verse.verseNumber}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 hover:underline transition"
                  >
                    Ler o capítulo completo
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sobre */}
        <section id="sobre" className="px-4 pb-12 md:pb-16 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Sobre o Projeto
              </span>
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-start">
              <div className="space-y-4">
                <h2 className="font-lora text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-100">
                  Como posso participar?
                </h2>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  Inspirado pelo projeto{" "}
                  <a
                    href="https://reavivadosporsuapalavra.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Reavivados por Sua Palavra
                  </a>
                  , incentivamos a leitura da bíblia <strong>um capítulo por dia</strong>.
                  Após a leitura, é comum perceber detalhes interessantes ou lições
                  edificantes &mdash; é esse tipo de comentário que vale a pena compartilhar.
                </p>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                  A leitura deve ser feita na sua <strong>bíblia pessoal</strong>,
                  independente da versão. O site serve apenas como espaço para os
                  comentários e tópicos levantados pela comunidade.
                </p>
              </div>

              <blockquote className="font-lora text-lg md:text-xl italic text-stone-700 dark:text-stone-200 leading-relaxed border-l-4 border-amber-500 dark:border-amber-600 pl-5 py-2">
                &ldquo;[…] Deus nosso Salvador, o qual deseja que todos os homens sejam
                salvos e cheguem ao pleno conhecimento da verdade.&rdquo;
                <cite className="block mt-3 text-sm not-italic font-semibold text-amber-700 dark:text-amber-300">
                  — 1 Timóteo 2:3-4
                </cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Tipos de comentário */}
        <section id="tipos" className="px-4 pb-12 md:pb-16 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Tipos de Comentário
              </span>
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
            </div>

            <p className="text-center text-stone-500 dark:text-stone-400 mb-8 max-w-2xl mx-auto">
              Cada comentário pode ser etiquetado com até quatro tipos, ajudando a
              comunidade a entender a perspectiva por trás dele.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COMMENT_TYPES.map((t) => (
                <div
                  key={t.label}
                  className={`bg-gradient-to-br ${t.color} border rounded-2xl p-5 transition hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className={`${t.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                    <Image src={t.icon} alt={t.label} width={24} height={24} />
                  </div>
                  <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-1.5">
                    {t.label}
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como participar (ações) */}
        <section id="acoes" className="px-4 pb-12 md:pb-16 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                O Que Você Pode Fazer
              </span>
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
            </div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              {ACTIONS.map((a) => (
                <div
                  key={a.title}
                  className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-6 hover:border-brand/40 transition"
                >
                  <div className="bg-brand-soft w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Image src={a.icon} alt={a.title} width={24} height={24} />
                  </div>
                  <h3 className="font-semibold text-stone-800 dark:text-stone-100 text-lg mb-2">
                    {a.title}
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    {a.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Conta */}
        <section id="conta" className="px-4 pb-12 md:pb-16 scroll-mt-16">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-2xl p-6 md:p-8">
            <h2 className="font-lora text-2xl md:text-3xl font-bold text-stone-800 dark:text-stone-100 mb-5">
              Por que preciso me cadastrar?
            </h2>
            <div className="space-y-4 text-stone-600 dark:text-stone-300 leading-relaxed">
              <p>
                Para identificação na criação dos comentários e tópicos &mdash; mas
                <strong> todo o conteúdo é visível</strong> mesmo sem conta. Você só
                precisa se cadastrar para participar ativamente.
              </p>
              <p>
                Você não receberá <strong>e-mails nem notificações externas</strong>:
                o e-mail serve apenas como forma de identificação ao entrar na conta.
                Você pode <strong>deletar sua conta</strong> a qualquer momento, assim
                como pode deletar quaisquer comentários que tenha feito.
              </p>
            </div>

            {!isLoggedIn && (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="flex-1 text-center bg-amber-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-amber-700 transition"
                >
                  Criar conta gratuita
                </Link>
                <Link
                  href="/login"
                  className="flex-1 text-center bg-stone-100 dark:bg-slate-800 text-stone-800 dark:text-stone-100 px-5 py-2.5 rounded-lg font-medium hover:bg-stone-200 dark:hover:bg-slate-700 transition"
                >
                  Já tenho conta
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Books */}
        <section id="livros" className="px-4 pb-16 scroll-mt-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                Navegue pelos Livros
              </span>
              <div className="h-px flex-1 bg-stone-200 dark:bg-slate-700" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 shadow-sm p-6">
              <BooksIndex initialBooks={books} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 dark:text-stone-500">
          <div className="flex items-center gap-2">
            <Image src="/assets/logo.svg" alt="Bible Comment" width={20} height={20} className="opacity-60" />
            <span>Bible Comment &mdash; A Program for His Glory</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            <Link href="/#sobre" className="hover:text-stone-600 dark:hover:text-stone-300 transition">Sobre</Link>
            <Link href="/privacy" className="hover:text-stone-600 dark:hover:text-stone-300 transition">Privacidade</Link>
            <Link href="/terms" className="hover:text-stone-600 dark:hover:text-stone-300 transition">Termos</Link>
            <a
              href="mailto:jdsc@cin.ufpe.br"
              className="hover:text-stone-600 dark:hover:text-stone-300 transition"
            >
              Contato LGPD
            </a>
            <a
              href="https://github.com/JDaniloC/Biblecomment"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-600 dark:hover:text-stone-300 transition"
            >
              GitHub
            </a>
            {isLoggedIn && (
              <Link href="/profile" className="hover:text-stone-600 dark:hover:text-stone-300 transition">Perfil</Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
