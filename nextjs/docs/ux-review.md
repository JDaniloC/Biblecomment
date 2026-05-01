# UX Review (humano)

Checklist manual a ser executado antes de cada release pública. Lighthouse
e os specs Cypress cobrem o que é mensurável; este documento cobre o que
exige olho humano.

Ambiente: `npm run dev:mongo` (orchestrator com Mongo em memória) ou
`npm run dev` apontando para o Mongo local. Em qualquer caso, **nunca**
contra Atlas/produção — `assertLocalMongoUri` deve bloquear antes de chegar
nas tasks.

## Dark mode visual

- [ ] Toggle claro→escuro na home, percorrer Header → Modal de Livros
- [ ] /chapter/gn/1: cabeçalho, lista de versículos, sidebar de comentários
- [ ] /profile: todas as abas (overview, comentários, favoritos, configurações)
- [ ] /discussion/gn (lista) + /discussion/gn/<id> (detalhe + form abrir)
- [ ] /admin/moderation (entrar como `mod@cypress.test`)
- [ ] /help: percorrer as 4 seções (Introduction, AboutComment, AboutActions, HelpAccount)
- [ ] /backup, /admin: cards de ações em ambos os temas

## Responsivo (DevTools 360 / 768 / 1280)

- [ ] Home: hero centralizado, cards alinhados, sem overflow horizontal
- [ ] Chapter: sidebar drawer aparece em mobile (swipe horizontal funciona)
- [ ] Profile: tabs scrollam horizontalmente em mobile
- [ ] Modal de Livros: grid de capítulos legível em 360px (`grid-cols-5` em mobile)
- [ ] Header: botões "Livros"/"Perfil" ainda clicáveis sem rótulo (icon-only)
- [ ] OmniSearch: dropdown não estoura viewport em 360px

## Tutorial guiado

- [ ] Cadastro novo → /chapter/jo/3 → tour abre automaticamente
- [ ] `Esc` fecha; reload no mesmo browser não reabre
- [ ] /profile → Configurações → "Refazer tutorial" → /chapter/jo/3?tour=1 → tour reabre
- [ ] Step "primeiro versículo" highlighta o item correto
- [ ] `prefers-reduced-motion: reduce`: tour anima sem scroll suave

## LGPD flows

- [ ] /register sem checkbox de consentimento → submit bloqueado + mensagem clara
- [ ] /register com checkbox marcado → cadastra, redireciona /login
- [ ] /profile → Configurações → "Exportar meus dados (JSON)" → arquivo baixa,
      contém `comments`, `ownedDiscussions`, `answersAuthored` sem `password`
- [ ] /profile → "Excluir conta" → confirma, conta apagada,
      comentários permanecem como `[usuário removido]`
- [ ] /privacy e /terms acessíveis sem login, com data de vigência atualizada
- [ ] Footer da home: links Privacidade/Termos/Contato LGPD funcionando

## Notificações & toasts

- [ ] alice posta comentário com `@bob` → bob vê badge de notificação
      em < 60s; clicar marca como lida
- [ ] Toast aparece no canto inferior direito; `aria-live="polite"`
      (validar com NVDA/VoiceOver se disponível)
- [ ] Erros graves usam toast com `role="alert"` (não `status`)

## Keyboard navigation

- [ ] Tab da página inicial: skip-link → header → search → main → footer
- [ ] Esc fecha modal e devolve foco ao botão que abriu
- [ ] Tour: setas avançam, Esc fecha, Tab cicla dentro do popover
- [ ] /chapter/[abbrev]/[chapter]: ←/→ navegam capítulos sem conflitar com tour

## Pós-execução

Marcar PRs/issues abertos para qualquer item desmarcado. Se nada
desmarcado, registrar timestamp + versão da release no rodapé deste
arquivo na próxima revisão.
