# Biblecomment — frontend-next (M1)

Fundação do frontend em Next.js + TypeScript + TailwindCSS (App Router).

## Requisitos
- Node.js 20+
- npm (ou pnpm/yarn)

## Instalação
```bash
cd frontend-next
npm install
```

## Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3001`.

## Build
```bash
npm run build && npm start
```

## Lint e Typecheck
```bash
npm run lint
npm run typecheck
```

## Variáveis de ambiente
Copie `.env.example` para `.env.local` e ajuste:
- `NEXT_PUBLIC_API_BASE_URL`

## Estrutura
- `app/` (App Router)
- `components/` (componentes compartilhados)
- `lib/` (helpers, cliente HTTP, SEO, auth)
- `src/server/` (DAL, DTOs – server-only)
- `styles/` (Tailwind + estilos globais)
