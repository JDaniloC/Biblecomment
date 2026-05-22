import type { DriveStep } from "driver.js";

/**
 * Guided-tour definitions. Every page tour lives here so the registry
 * below (`TUTORIALS`) can drive both the auto-start on first visit and
 * the "Tutoriais guiados" list in /profile → Configurações.
 *
 * Targets must be persistent elements — driver.js only highlights what
 * is mounted when the step runs, so anchor to headers / nav / sections
 * that don't depend on a modal or a lazily-rendered list being present.
 */

/* ───────────────────────── Chapter ───────────────────────── */

// Tour de orientação do capítulo. Targets devem ser elementos persistentes
// (não dependem de modal aberto / sidebar visível) — driver.js só consegue
// destacar o que está montado na hora do step.
export const CHAPTER_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Boas-vindas ao BibleComment 👋",
			description:
				"Vou mostrar em poucos passos como ler, comentar e participar das discussões. Você pode pular a qualquer momento com Esc.",
		},
	},
	{
		element: '[data-tour="livros-link"]',
		popover: {
			title: "Navegar pelos livros",
			description:
				"Clique aqui para voltar à lista de livros e escolher outro capítulo.",
			side: "bottom",
			align: "start",
		},
	},
	{
		element: '[data-tour="omnisearch"]',
		popover: {
			title: "Busca global",
			description:
				"Procure versículos ou comentários por palavra-chave. Resultados aparecem enquanto você digita.",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="verse-first"]',
		popover: {
			title: "Os versículos",
			description:
				"Clique em qualquer versículo para abrir o painel lateral e ler ou adicionar comentários — devocional, exegético, pessoal ou inspirado.",
			side: "right",
			align: "start",
		},
	},
	{
		element: '[data-tour="user-menu"]',
		popover: {
			title: "Sua conta",
			description:
				"No menu da sua foto você acessa Perfil, Configurações, Privacidade e exportar seus dados (LGPD). Aqui também fica o seletor de comunidade ativa — se você seguir uma comunidade, os comentários dos membros aprovados aparecem priorizados na leitura.",
			side: "left",
		},
	},
	{
		popover: {
			title: "Pronto, bom estudo! 🙌",
			description:
				"Lembre: você pode refazer este tutorial em Perfil → Configurações → Tutoriais guiados.",
		},
	},
];

/* ───────────────────────── Home ───────────────────────── */

export const HOME_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Bem-vindo à sua tela inicial 🏠",
			description:
				"Aqui você acompanha sua leitura, vê a atividade da comunidade e escolhe um livro para ler. Pule com Esc quando quiser.",
		},
	},
	{
		element: '[data-tour="home-streak"]',
		popover: {
			title: "Sua sequência de leitura",
			description:
				"Mantenha o ritmo: cada dia em que você lê, comenta ou marca um capítulo conta para a sua sequência. O botão leva ao capítulo de hoje do plano.",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="home-feed"]',
		popover: {
			title: "Atividade da comunidade",
			description:
				"Comentários recentes, de quem você segue, os mais populares e as discussões ativas — tudo num só lugar.",
			side: "top",
		},
	},
	{
		element: '[data-tour="home-books"]',
		popover: {
			title: "Os livros",
			description:
				"Toque em um livro para escolher o capítulo. A cor de cada card mostra o seu progresso de leitura.",
			side: "top",
		},
	},
	{
		popover: {
			title: "Bom estudo! 📖",
			description:
				"Reveja este tour quando quiser em Perfil → Configurações → Tutoriais guiados.",
		},
	},
];

/* ───────────────────────── Communities ───────────────────────── */

export const COMMUNITIES_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Comunidades 🤝",
			description:
				"Comunidades reúnem leitores em torno de um tema ou denominação. Veja como participar.",
		},
	},
	{
		element: '[data-tour="communities-create"]',
		popover: {
			title: "Crie a sua",
			description:
				"Você pode criar até 3 comunidades. Como criador, você modera quem entra e conduz as discussões.",
			side: "bottom",
			align: "end",
		},
	},
	{
		element: '[data-tour="communities-search"]',
		popover: {
			title: "Encontre comunidades",
			description:
				"Busque por nome ou identificador. Abra o card de uma comunidade para ver os detalhes e solicitar entrada.",
			side: "bottom",
		},
	},
	{
		popover: {
			title: "Leitura priorizada",
			description:
				"Ao seguir uma comunidade e ter sua entrada aprovada, os comentários dos membros passam a aparecer destacados na sua leitura.",
		},
	},
];

/* ───────────────────────── Discussions ───────────────────────── */

export const DISCUSSIONS_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Discussões 💬",
			description:
				"Discussões são perguntas e debates da comunidade ligados a um versículo.",
		},
	},
	{
		element: '[data-tour="discussions-list"]',
		popover: {
			title: "Temas em aberto",
			description:
				"Cada card é uma pergunta. Abra um para ler as respostas e contribuir com a sua.",
			side: "top",
		},
	},
	{
		popover: {
			title: "Comece uma discussão",
			description:
				"Para abrir um novo tema, vá a um versículo e use o painel de discussão daquele trecho.",
		},
	},
];

/* ───────────────────────── Profile ───────────────────────── */

/**
 * Click a profile sidebar tab from inside a tour step. The tab buttons
 * are persistent (always mounted), so highlighting them is safe; this
 * just switches the panel behind the highlight so the user sees the
 * section being described — including the badges grid.
 */
function clickProfileTab(tourId: string): void {
	if (typeof document === "undefined") return;
	const el = document.querySelector(`[data-tour="${tourId}"]`);
	if (el instanceof HTMLElement) el.click();
}

export const PROFILE_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Seu perfil 👤",
			description:
				"Um tour rápido pelas seções do seu perfil: atividade, conquistas e configurações. Pule com Esc a qualquer momento.",
		},
	},
	{
		element: '[data-tour="profile-user-card"]',
		popover: {
			title: "Seu cartão",
			description:
				"Nome, identificador (@), denominação e desde quando você faz parte da comunidade.",
			side: "right",
			align: "start",
		},
	},
	{
		element: '[data-tour="profile-tab-overview"]',
		popover: {
			title: "Visão geral",
			description:
				"Suas estatísticas — comentários, livros e capítulos comentados — além de seguidores e atividade recente.",
			side: "right",
		},
		onHighlightStarted: () => clickProfileTab("profile-tab-overview"),
	},
	{
		element: '[data-tour="profile-tab-badges"]',
		popover: {
			title: "Conquistas",
			description:
				"Suas medalhas. Você desbloqueia conquistas lendo capítulos, comentando, recebendo curtidas e mantendo a sua sequência diária de leitura.",
			side: "right",
		},
		onHighlightStarted: () => clickProfileTab("profile-tab-badges"),
	},
	{
		element: '[data-tour="profile-tab-config"]',
		popover: {
			title: "Configurações e privacidade",
			description:
				"Lembrete diário de leitura, privacidade do perfil, troca de senha, exportar seus dados (LGPD) e refazer qualquer tutorial.",
			side: "right",
		},
		onHighlightStarted: () => clickProfileTab("profile-tab-config"),
	},
	{
		popover: {
			title: "Pronto! 🎉",
			description:
				"Você pode refazer este e os outros tutoriais aqui em Configurações → Tutoriais guiados.",
		},
	},
];

/* ───────────────────────── Registry ───────────────────────── */

// Identifiers persisted in localStorage (and synced to the user's
// `tutorialsCompleted`). Bump the suffix (e.g. "chapter-v2") to re-show a
// substantially changed tour to users who already finished the old one.
export const CHAPTER_TUTORIAL_NAME = "chapter-v1" as const;
export const HOME_TUTORIAL_NAME = "home-v1" as const;
export const COMMUNITIES_TUTORIAL_NAME = "communities-v1" as const;
export const DISCUSSIONS_TUTORIAL_NAME = "discussions-v1" as const;
export const PROFILE_TUTORIAL_NAME = "profile-v1" as const;

export interface TutorialDef {
	/** Versioned localStorage / server flag id. */
	name: string;
	/** driver.js steps for the tour. */
	steps: DriveStep[];
	/** Short label for the "Tutoriais guiados" list. */
	label: string;
	/** One-line description for that list. */
	description: string;
	/** Where "Refazer" navigates — `?tour=1` forces the tour to open. */
	reviewPath: string;
}

/**
 * Every guided tour, in the order a new user typically meets them.
 * Drives the profile "Tutoriais guiados" card; each page auto-starts its
 * own tour on first visit via `<PageTutorial>`.
 */
export const TUTORIALS: TutorialDef[] = [
	{
		name: HOME_TUTORIAL_NAME,
		steps: HOME_TUTORIAL,
		label: "Tela inicial",
		description: "Sequência de leitura, feed da comunidade e os livros.",
		reviewPath: "/home?tour=1",
	},
	{
		name: CHAPTER_TUTORIAL_NAME,
		steps: CHAPTER_TUTORIAL,
		label: "Leitura e comentários",
		description: "Como ler capítulos, comentar versículos e navegar.",
		reviewPath: "/chapter/jo/3?tour=1",
	},
	{
		name: COMMUNITIES_TUTORIAL_NAME,
		steps: COMMUNITIES_TUTORIAL,
		label: "Comunidades",
		description: "Criar, encontrar e participar de comunidades.",
		reviewPath: "/communities?tour=1",
	},
	{
		name: DISCUSSIONS_TUTORIAL_NAME,
		steps: DISCUSSIONS_TUTORIAL,
		label: "Discussões",
		description: "Perguntas e debates da comunidade.",
		reviewPath: "/discussions?tour=1",
	},
	{
		name: PROFILE_TUTORIAL_NAME,
		steps: PROFILE_TUTORIAL,
		label: "Seu perfil",
		description: "Atividade, conquistas e configurações.",
		reviewPath: "/profile?tour=1",
	},
];
