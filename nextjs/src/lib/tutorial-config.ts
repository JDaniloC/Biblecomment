import type { DriveStep } from "driver.js";

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
        "Lembre: você pode refazer este tutorial em Perfil → Configurações → Tutorial guiado.",
    },
  },
];

// Identifier persistido em localStorage. Se o conjunto de steps mudar
// substancialmente no futuro, basta bumpar (ex: "chapter-v2") para que
// usuários antigos vejam o tour atualizado.
export const CHAPTER_TUTORIAL_NAME = "chapter-v1" as const;
