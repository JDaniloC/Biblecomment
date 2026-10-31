"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageTutorial } from "@/components/Tutorial/PageTutorial";
import { HELP_TUTORIAL, HELP_TUTORIAL_NAME } from "@/lib/tutorial-config";

const TUTORIAL_CARDS = [
	{
		title: "Página Inicial (Vitrine)",
		desc: "Visão geral da plataforma, busca de versículos e livro em destaque do dia.",
		href: "/?tour=1",
		badge: "Página Principal",
	},
	{
		title: "Leitor de Capítulos",
		desc: "Como navegar versículos, acionar áudio narrado, mudar tamanho da fonte e ler comentários.",
		href: "/chapter/jo/3?tour=1",
		badge: "Estudo Bíblico",
	},
	{
		title: "Tela Inicial (Livros & Feed)",
		desc: "Acompanhe sua sequência diária (streak), o feed comunitário e seu progresso na Bíblia.",
		href: "/home?tour=1",
		badge: "Dashboard",
	},
	{
		title: "Comunidades",
		desc: "Como criar sua congregação/grupo, encontrar comunidades afins e ter comentários priorizados.",
		href: "/communities?tour=1",
		badge: "Grupos",
	},
	{
		title: "Discussões Bíblicas",
		desc: "Debates e perguntas da comunidade ligadas aos versículos com respostas colaborativas.",
		href: "/discussions?tour=1",
		badge: "Debates",
	},
	{
		title: "Busca Bíblica & Teológica",
		desc: "Pesquise qualquer palavra-chave, texto bíblico ou usuário em segundos.",
		href: "/search?tour=1",
		badge: "Pesquisa",
	},
	{
		title: "Perfil & Conquistas",
		desc: "Suas medalhas de leitura, estatísticas pessoais, favoritos e configurações de conta.",
		href: "/profile?tour=1",
		badge: "Perfil",
	},
];

const SHORTCUTS = [
	{ key: "← / →", desc: "Avançar ou voltar capítulos na tela de leitura bíblica" },
	{ key: "Esc", desc: "Fechar o painel lateral de comentários, modais ou tours" },
	{ key: "A+ / A−", desc: "Aumentar ou diminuir o tamanho da fonte e zoom do app" },
	{ key: "?", desc: "Abrir o menu flutuante de ajuda e tutoriais no canto inferior direito" },
];

const COMMENT_TYPES = [
	{
		src: "/assets/hand.svg",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-200 dark:border-amber-900/40",
		label: "Devocional",
		desc: "Ensinamento prático extraído do texto sagrado para a vida diária e espiritual.",
	},
	{
		src: "/assets/book.svg",
		bg: "bg-blue-50 dark:bg-blue-950/30",
		border: "border-blue-200 dark:border-blue-900/40",
		label: "Exegético",
		desc: "Estudo aprofundado do texto original, contexto histórico-cultural e referências de teólogos.",
	},
	{
		src: "/assets/person.svg",
		bg: "bg-violet-50 dark:bg-violet-950/30",
		border: "border-violet-200 dark:border-violet-900/40",
		label: "Pessoal",
		desc: "Testemunho ou experiência pessoal de como o versículo impactou a trajetória do leitor.",
	},
	{
		src: "/assets/pen.svg",
		bg: "bg-green-50 dark:bg-green-950/30",
		border: "border-green-200 dark:border-green-900/40",
		label: "Inspirado",
		desc: "Comentários e escritos atribuídos a profetas ou autores inspirados que iluminam o texto.",
	},
];

const FAQ_ITEMS = [
	{
		q: "O que é o Bible Comment e qual seu objetivo?",
		a: "O Bible Comment é uma plataforma colaborativa cristã criada para o ensino e a propagação das Escrituras Sagradas através do compartilhamento de comentários, exegeses e estudos bíblicos versículo por versículo. Um programa para a glória de Deus.",
	},
	{
		q: "O Bible Comment substitui minha Bíblia física?",
		a: "Não! Incentivamos que sua leitura primária seja sempre feita na sua Bíblia física ou preferida. O Bible Comment é uma ferramenta de apoio e comunidade para registrar anotações, tirar dúvidas e enriquecer seu entendimento com comentários de outros irmãos.",
	},
	{
		q: "Como funciona a leitura de um capítulo por dia?",
		a: "Inspirado no projeto internacional 'Reavivados por Sua Palavra', a plataforma incentiva o hábito diário de leitura. Ao marcar capítulos como lidos, você acumula dias seguidos (streak) e desbloqueia medalhas de conquista no seu perfil.",
	},
	{
		q: "O que são Comunidades e o que é 'Leitura Priorizada'?",
		a: "Comunidades são grupos formados por congregações, círculos de estudo ou denominações. Quando você participa de uma comunidade, os comentários e estudos dos membros aprovados aparecem destacados e priorizados na sua leitura bíblica.",
	},
	{
		q: "Preciso pagar para usar alguma funcionalidade?",
		a: "Não. O Bible Comment é 100% gratuito, sem anúncios intrusivos e possui seu código-fonte aberto para a comunidade.",
	},
	{
		q: "Como meus dados e privacidade são protegidos (LGPD)?",
		a: "Respeitamos integralmente a sua privacidade. Você pode a qualquer momento exportar todos os seus dados em formato JSON em Perfil → Configurações → Exportar Dados (LGPD) ou solicitar a exclusão definitiva da sua conta.",
	},
];

export function HelpClient() {
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

	const handleStartHelpTour = () => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("bc:start-tour"));
		}
	};

	const filteredFaq = useMemo(() => {
		if (!searchQuery.trim()) return FAQ_ITEMS;
		const queryTerm = searchQuery.toLowerCase();
		return FAQ_ITEMS.filter(
			(item) => item.q.toLowerCase().includes(queryTerm) || item.a.toLowerCase().includes(queryTerm),
		);
	}, [searchQuery]);

	return (
		<div className="min-h-screen bg-stone-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-16">
			{/* Header */}
			<header className="bg-white dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
				<div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<Link
							href="/"
							className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-brand transition no-underline"
							aria-label="Voltar para a página inicial"
							title="Voltar"
						>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M19 12H5M12 19l-7-7 7-7" />
							</svg>
						</Link>
						<div className="flex items-center gap-2.5">
							<Logo width={26} height={26} />
							<div>
								<h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-none">
									Central de Ajuda & Sobre
								</h1>
								<span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
									Guias, Dúvidas e Tutoriais Interativos
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 sm:gap-3">
						<button
							type="button"
							onClick={handleStartHelpTour}
							data-testid="start-help-tour-header"
							className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/30 bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20 transition cursor-pointer"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<polygon points="10 8 16 12 10 16 10 8" />
							</svg>
							Tour da Central
						</button>
						<ThemeToggle />
					</div>
				</div>
			</header>

			{/* Hero & Search */}
			<section className="bg-gradient-to-b from-white to-stone-50 dark:from-slate-900 dark:to-slate-950 py-10 px-4 border-b border-stone-200/60 dark:border-slate-800/60">
				<div className="max-w-3xl mx-auto text-center space-y-4">
					<span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-brand/10 text-brand border border-brand/20">
						Suporte & Aprendizado
					</span>
					<h2 className="font-lora text-3xl sm:text-4xl font-bold tracking-tight">
						Como podemos ajudar você hoje?
					</h2>
					<p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
						Explore como funciona a leitura versículo por versículo, atalhos de teclado, criação de comunidades e tutoriais passo a passo.
					</p>

					{/* Search input */}
					<div data-tour="help-search" className="relative max-w-xl mx-auto pt-2">
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="m21 21-4.35-4.35" />
						</svg>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Buscar por atalhos, áudio narrado, tags, streak, comunidades…"
							aria-label="Buscar na central de ajuda"
							className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								aria-label="Limpar busca"
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
							>
								✕
							</button>
						)}
					</div>
				</div>
			</section>

			<main id="main-content" className="max-w-5xl mx-auto px-4 py-8 space-y-12">
				{/* 1. Hub de Tutoriais Guiados */}
				<section data-tour="help-interactive-tours" className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-bold flex items-center gap-2">
								<span>🧭</span>
								<span>Tutoriais Interativos Guiados</span>
							</h3>
							<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
								Abra qualquer tour interativo para ser conduzido elemento por elemento na tela correspondente.
							</p>
						</div>
					</div>

					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{TUTORIAL_CARDS.map((tut) => (
							<div
								key={tut.title}
								className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-brand/50 transition group"
							>
								<div>
									<span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-full mb-2">
										{tut.badge}
									</span>
									<h4 className="font-semibold text-sm mb-1 group-hover:text-brand transition">
										{tut.title}
									</h4>
									<p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
										{tut.desc}
									</p>
								</div>
								<Link
									href={tut.href}
									className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-brand hover:text-white text-xs font-semibold transition no-underline"
								>
									<span>Abrir Tutorial</span>
									<span>→</span>
								</Link>
							</div>
						))}
					</div>
				</section>

				{/* 2. O Projeto & Participação */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span>📖</span>
						<h3 className="text-lg font-bold">O Projeto Bible Comment</h3>
					</div>
					<div className="grid sm:grid-cols-2 gap-4">
						<div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-5 flex flex-col gap-2">
							<span className="text-2xl">🕊️</span>
							<h4 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">O que é a plataforma?</h4>
							<p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">
								Um projeto sem fins lucrativos dedicado ao ensino e à propagação da Bíblia Sagrada por meio do compartilhamento de comentários, exegeses e aprendizados espirituais.
							</p>
						</div>
						<div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-2xl p-5 flex flex-col gap-2">
							<span className="text-2xl">📚</span>
							<h4 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Como funciona o estudo?</h4>
							<p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">
								Leia um capítulo por dia — como propõe o projeto mundial &quot;Reavivados por Sua Palavra&quot; — e compartilhe insights e reflexões na comunidade. A leitura principal deve ser feita na sua Bíblia física pessoal.
							</p>
						</div>
					</div>
				</section>

				{/* 3. Tipos de Comentário */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span>💬</span>
						<h3 className="text-lg font-bold">Os 4 Tipos de Comentário Bíblico</h3>
					</div>
					<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
						Ao comentar um versículo ou capítulo, marque uma etiqueta para que outros leitores entendam a lente de análise:
					</p>
					<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{COMMENT_TYPES.map((t) => (
							<div
								key={t.label}
								className={`${t.bg} border ${t.border} rounded-2xl p-5 flex flex-col gap-3 shadow-xs`}
							>
								<div className="w-9 h-9 rounded-full bg-white/80 dark:bg-slate-900/80 flex items-center justify-center shadow-xs">
									<Image src={t.src} alt={t.label} width={20} height={20} />
								</div>
								<h4 className="font-semibold text-sm">{t.label}</h4>
								<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
									{t.desc}
								</p>
							</div>
						))}
					</div>
				</section>

				{/* 4. Leitura & Áudio */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span>🎧</span>
						<h3 className="text-lg font-bold">Recursos do Leitor & Áudio Narrado</h3>
					</div>
					<div className="grid sm:grid-cols-3 gap-4">
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">🎧</span>
							<h4 className="font-semibold text-sm">Áudio Narrado</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Ouça o capítulo narrado versículo a versículo clicando no botão &quot;Ouvir&quot; na barra superior ou na barra inferior flutuante.
							</p>
						</div>
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">🔍</span>
							<h4 className="font-semibold text-sm">Tamanho do Texto (Zoom)</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Ajuste a escala visual do leitor através dos botões A− e A+ para uma leitura confortável em qualquer tamanho de monitor.
							</p>
						</div>
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">✓</span>
							<h4 className="font-semibold text-sm">Marcar como Lido</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Clique no botão &quot;Marcar como lido&quot; no topo ou final do capítulo para computar seu progresso na Bíblia e manter sua sequência diária ativa.
							</p>
						</div>
					</div>
				</section>

				{/* 5. Comunidades & Grupos */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span>🤝</span>
						<h3 className="text-lg font-bold">Comunidades & Leitura Priorizada</h3>
					</div>
					<div className="grid sm:grid-cols-2 gap-4">
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">🏛️</span>
							<h4 className="font-semibold text-sm">Criar e Conduzir Grupos</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Você pode criar até 3 comunidades para sua igreja local, grupo de jovens ou círculo teológico, moderando a entrada de novos membros.
							</p>
						</div>
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">⭐</span>
							<h4 className="font-semibold text-sm">Comentários Priorizados</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Selecione a comunidade ativa no menu da sua foto: ao ler a Bíblia, os comentários dos membros daquele grupo aparecem no topo de cada versículo!
							</p>
						</div>
					</div>
				</section>

				{/* 6. Atalhos de Teclado */}
				<section data-tour="help-shortcuts" className="space-y-4">
					<div className="flex items-center gap-2">
						<span>⌨️</span>
						<h3 className="text-lg font-bold">Atalhos de Teclado no Desktop</h3>
					</div>
					<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
						<table className="w-full text-left text-sm">
							<thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase tracking-wider">
								<tr>
									<th className="py-3 px-4 w-40 font-semibold">Tecla</th>
									<th className="py-3 px-4 font-semibold">Ação no Aplicativo</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{SHORTCUTS.map((s) => (
									<tr key={s.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
										<td className="py-3 px-4">
											<kbd className="inline-block px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-xs text-slate-800 dark:text-slate-100">
												{s.key}
											</kbd>
										</td>
										<td className="py-3 px-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
											{s.desc}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				{/* 7. Conta, Gamificação & LGPD */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span>👤</span>
						<h3 className="text-lg font-bold">Conta, Medalhas & Privacidade (LGPD)</h3>
					</div>
					<div className="grid sm:grid-cols-3 gap-4">
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">🔥</span>
							<h4 className="font-semibold text-sm">Sequência Diária (Streak)</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Leia, comente ou marque capítulos diariamente para manter o fogo da sua sequência aceso e construir o hábito diário de comunhão.
							</p>
						</div>
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">🏅</span>
							<h4 className="font-semibold text-sm">Medalhas e Conquistas</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Desbloqueie insígnias teológicas especiais ao concluir livros bíblicos, receber curtidas e participar ativamente dos debates.
							</p>
						</div>
						<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-2">
							<span className="text-2xl">🛡️</span>
							<h4 className="font-semibold text-sm">Privacidade & LGPD</h4>
							<p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
								Seus dados pertencem a você. Exporte todas as suas anotações em JSON ou exclua sua conta a qualquer momento nas configurações do perfil.
							</p>
						</div>
					</div>
				</section>

				{/* 8. FAQ com Accordion */}
				<section data-tour="help-faq" className="space-y-4">
					<div className="flex items-center gap-2">
						<span>❓</span>
						<h3 className="text-lg font-bold">Perguntas Frequentes (FAQ)</h3>
					</div>
					<div className="space-y-3">
						{filteredFaq.map((item, idx) => {
							const open = expandedFaq === idx;
							return (
								<div
									key={item.q}
									className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs transition"
								>
									<button
										type="button"
										onClick={() => setExpandedFaq(open ? null : idx)}
										className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 font-semibold text-sm hover:text-brand transition cursor-pointer"
									>
										<span>{item.q}</span>
										<span className="text-slate-400 text-lg">{open ? "−" : "+"}</span>
									</button>
									{open && (
										<div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
											{item.a}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 mt-12">
				<div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 dark:text-stone-500">
					<div>BibleComment &mdash; A Program for His Glory</div>
					<div className="flex items-center gap-4">
						<Link href="/home" className="hover:text-brand transition no-underline">
							Início
						</Link>
						<Link href="/privacy" className="hover:text-brand transition no-underline">
							Privacidade
						</Link>
						<a
							href="https://github.com/JDaniloC/Biblecomment"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-brand transition no-underline"
						>
							Código Aberto (GitHub)
						</a>
					</div>
				</div>
			</footer>

			{/* Guided Tour for the Help Center */}
			<PageTutorial
				name={HELP_TUTORIAL_NAME}
				steps={HELP_TUTORIAL}
				enabled
				alreadyCompleted
				autoStart={false}
			/>
		</div>
	);
}
