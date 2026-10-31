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

/* ───────────────────────── Landing Page ───────────────────────── */

export const LANDING_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Bem-vindo ao BibleComment 🕊️",
			description:
				"Sua plataforma comunitária de estudos e reflexões bíblicas. Vamos conhecer as principais áreas da página inicial!",
		},
	},
	{
		element: '[data-tour="landing-search"]',
		popover: {
			title: "Busca Rápida",
			description:
				"Pesquise versículos, passagens e comentários por palavras-chave ou referência direta (ex: Gn 1:1).",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="landing-daily-verse"]',
		popover: {
			title: "Versículo do Dia",
			description:
				"Uma passagem bíblica e reflexões em destaque selecionadas para cada dia do ano.",
			side: "top",
		},
	},
	{
		element: '[data-tour="landing-about"]',
		popover: {
			title: "O Projeto e a Comunidade",
			description:
				"Inspirado no projeto 'Reavivados por Sua Palavra' (um capítulo por dia), incentivando o estudo na sua Bíblia pessoal e o compartilhamento de aprendizados.",
			side: "top",
		},
	},
	{
		element: '[data-tour="landing-types"]',
		popover: {
			title: "Tipos de Comentário",
			description:
				"Cada anotação é classificada entre Devocional, Exegético, Pessoal ou Inspirado para enriquecer o entendimento teológico.",
			side: "top",
		},
	},
	{
		element: '[data-tour="landing-actions"]',
		popover: {
			title: "Ações da Comunidade",
			description:
				"Favorite comentários especiais, abra debates fraternos sobre interpretações ou reporte conteúdos para manter o ambiente saudável.",
			side: "top",
		},
	},
	{
		element: '[data-tour="landing-books"]',
		popover: {
			title: "Navegação por Livros",
			description:
				"Acesse os 66 livros da Bíblia e explore capítulos comentados pela comunidade.",
			side: "top",
		},
	},
	{
		popover: {
			title: "Bons estudos! ✨",
			description:
				"Crie sua conta gratuita para comentar, favoritar versículos e manter sua sequência de leitura.",
		},
	},
];

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
		element: '[data-tour="chapter-tools"]',
		popover: {
			title: "Ferramentas do leitor",
			description:
				"Ajuste o tamanho do texto (A- / A+) para uma leitura confortável e reproduza o áudio narrado do capítulo.",
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
		element: '[data-tour="mark-read-button"]',
		popover: {
			title: "Marcar como lido",
			description:
				"Marque o capítulo como lido para manter sua sequência diária e acompanhar seu progresso bíblico.",
			side: "top",
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
				"Lembre: você pode refazer este tutorial a qualquer momento pelo botão de ajuda no canto inferior ou em Perfil → Configurações.",
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
				"Reveja este tour quando quiser pelo botão de ajuda ou em Perfil → Configurações → Tutoriais guiados.",
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
		element: '[data-tour="communities-list"]',
		popover: {
			title: "Lista de grupos",
			description:
				"Explore congregações, grupos teológicos e círculos de oração criados por outros membros.",
			side: "top",
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
		element: '[data-tour="discussions-filters"]',
		popover: {
			title: "Filtrar conversas",
			description:
				"Filtre as discussões por livro bíblico ou busque por palavras-chave para encontrar temas específicos.",
			side: "bottom",
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
				"Para abrir um novo tema, vá a um versículo no leitor e use a opção de iniciar uma discussão vinculada ao texto.",
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
		element: '[data-tour="profile-tab-comments"]',
		popover: {
			title: "Meus Comentários",
			description:
				"Visualize e gerencie todos os comentários e reflexões bíblicas que você já compartilhou na plataforma.",
			side: "right",
		},
		onHighlightStarted: () => clickProfileTab("profile-tab-comments"),
	},
	{
		element: '[data-tour="profile-tab-favorites"]',
		popover: {
			title: "Versículos Favoritos",
			description:
				"Seus versículos salvos para fácil consulta e meditação a qualquer momento.",
			side: "right",
		},
		onHighlightStarted: () => clickProfileTab("profile-tab-favorites"),
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
				"Você pode refazer este e os outros tutoriais a qualquer momento pelo botão de ajuda no canto inferior ou aqui em Configurações.",
		},
	},
];

/* ───────────────────────── Search ───────────────────────── */

export const SEARCH_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Busca Bíblica 🔍",
			description:
				"Encontre versículos, anotações de estudo e membros da comunidade em segundos.",
		},
	},
	{
		element: '[data-tour="search-input"]',
		popover: {
			title: "Campo de pesquisa",
			description:
				"Digite palavras-chave, frases ou referências diretas (como 'João 3:16' ou 'Salmos 23').",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="search-results"]',
		popover: {
			title: "Resultados",
			description:
				"Veja passagens bíblicas e comentários relevantes correspondentes ao que você buscou.",
			side: "top",
		},
	},
];

/* ───────────────────────── Community Detail ───────────────────────── */

export const COMMUNITY_DETAIL_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Página da Comunidade 🏛️",
			description:
				"Conheça esta comunidade, acompanhe seus membros e veja suas publicações e reflexões bíblicas.",
		},
	},
	{
		element: '[data-tour="community-header"]',
		popover: {
			title: "Identificação",
			description:
				"Nome, descrição, liderança e status de participação nesta comunidade.",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="community-tabs"]',
		popover: {
			title: "Seções da comunidade",
			description:
				"Navegue entre os comentários produzidos pelo grupo, lista de membros e seguidores.",
			side: "bottom",
		},
	},
];

/* ───────────────────────── Discussion Detail ───────────────────────── */

export const DISCUSSION_DETAIL_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Discussão Bíblica 💬",
			description:
				"Aprofunde-se neste debate bíblico com a perspectiva de outros irmãos e leitores.",
		},
	},
	{
		element: '[data-tour="discussion-header"]',
		popover: {
			title: "Tema da discussão",
			description:
				"O autor, a pergunta levantada e a referência do versículo analisado.",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="discussion-replies"]',
		popover: {
			title: "Contribuições e respostas",
			description:
				"Leia as ideias de outros membros ou envie sua própria resposta.",
			side: "top",
		},
	},
];

/* ───────────────────────── Help Center ───────────────────────── */

export const HELP_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Central de Ajuda & Sobre 💡",
			description:
				"Aqui você encontra orientações detalhadas, atalhos úteis, explicações teológicas e tutoriais guiados.",
		},
	},
	{
		element: '[data-tour="help-search"]',
		popover: {
			title: "Busca Rápida de Dúvidas",
			description:
				"Digite qualquer tema ou dúvida (ex: 'áudio', 'comunidades', 'atalhos') para filtrar as respostas.",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="help-interactive-tours"]',
		popover: {
			title: "Hub de Tutoriais Guiados",
			description:
				"Inicie o tutorial interativo passo a passo de qualquer tela do aplicativo com apenas um clique!",
			side: "top",
		},
	},
	{
		element: '[data-tour="help-shortcuts"]',
		popover: {
			title: "Atalhos de Teclado",
			description:
				"Aprenda os atalhos rápidos para navegar entre capítulos com facilidade pelo teclado.",
			side: "top",
		},
	},
	{
		element: '[data-tour="help-faq"]',
		popover: {
			title: "Perguntas Frequentes (FAQ)",
			description:
				"Dúvidas sobre funcionamento da plataforma, gratuidade, privacidade LGPD e muito mais.",
			side: "top",
		},
	},
];

/* ───────────────────────── Public Profile ───────────────────────── */

export const PUBLIC_PROFILE_TUTORIAL: DriveStep[] = [
	{
		popover: {
			title: "Perfil do Membro 👤",
			description:
				"Veja as contribuições bíblicas, conquistas e reflexões compartilhadas por este usuário.",
		},
	},
	{
		element: '[data-tour="public-profile-card"]',
		popover: {
			title: "Cartão do Usuário",
			description:
				"Informações públicas, denominação ou crença declarada e botão para seguir este autor.",
			side: "bottom",
		},
	},
	{
		element: '[data-tour="public-profile-tabs"]',
		popover: {
			title: "Comentários e Medalhas",
			description:
				"Explore o histórico de comentários bíblicos deste membro e as medalhas conquistadas em sua jornada.",
			side: "bottom",
		},
	},
];

/* ───────────────────────── Registry ───────────────────────── */

// Identifiers persisted in localStorage (and synced to the user's
// `tutorialsCompleted`). Bump the suffix (e.g. "chapter-v2") to re-show a
// substantially changed tour to users who already finished the old one.
export const LANDING_TUTORIAL_NAME = "landing-v1" as const;
export const CHAPTER_TUTORIAL_NAME = "chapter-v1" as const;
export const HOME_TUTORIAL_NAME = "home-v1" as const;
export const COMMUNITIES_TUTORIAL_NAME = "communities-v1" as const;
export const DISCUSSIONS_TUTORIAL_NAME = "discussions-v1" as const;
export const PROFILE_TUTORIAL_NAME = "profile-v1" as const;
export const SEARCH_TUTORIAL_NAME = "search-v1" as const;
export const COMMUNITY_DETAIL_TUTORIAL_NAME = "community-detail-v1" as const;
export const DISCUSSION_DETAIL_TUTORIAL_NAME = "discussion-detail-v1" as const;
export const HELP_TUTORIAL_NAME = "help-v1" as const;
export const PUBLIC_PROFILE_TUTORIAL_NAME = "public-profile-v1" as const;

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
