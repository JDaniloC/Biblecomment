<p align="center">
  <img src=".github/title.png">
</p>

> A web site to read and share comments about Bible verses.

<p align="center">
  <img src="https://img.shields.io/badge/-Next.js%2014-black?style=flat&logo=next.js"/>
  <img src="https://img.shields.io/badge/-MongoDB-black?style=flat&logo=mongodb"/>
  <img src="https://img.shields.io/badge/-NextAuth%20v5-black?style=flat&logo=auth0"/>
  <img src="https://img.shields.io/badge/-Tailwind%20v4-black?style=flat&logo=tailwindcss"/>
  <img src="https://img.shields.io/badge/-Vitest-black?style=flat&logo=vitest"/>
  <img src="https://img.shields.io/badge/-Cypress-black?style=flat&logo=cypress"/>
</p>

<p align="center">
  <img alt="Home" src=".github/index.png">
</p>

## Motivation

This project started in 2020 as a place to share interpretations of the
Bible and answer difficult verses, born from personal note-taking on
Bible margins. The current incarnation lives as a Next.js + MongoDB
application under [`nextjs/`](./nextjs).

## Stack

- **Next.js 14** — App Router, Server Components, Server Actions, Route Handlers
- **MongoDB** via Mongoose — persistence layer
- **NextAuth.js v5** — credentials auth, MD5 → bcrypt upgrade on first
  login from legacy data
- **Tailwind v4** — `@theme` tokens in CSS, no `tailwind.config.ts` colors
- **next-themes** — dark mode (`attribute="class"`, system-aware)
- **pino** — structured server logs (`logger.error` wired into all `5xx` paths)
- **Sentry** — optional error reporting (no-op without `SENTRY_DSN`)
- **Zod** — request body validation across 9 schemas
- **Vitest** — unit tests for use cases + helpers (89 tests)
- **Cypress 15** — integration + E2E tests with `mongodb-memory-server`
  (~58 tests across auth, RBAC, comments, discussions, mentions,
  notifications, moderation, search, SEO)

## Architecture

The Next.js app under [`nextjs/src/`](./nextjs/src) follows Clean
Architecture, separating domain logic from framework specifics.

```
src/
├── domain/              # Entities (Comment, Discussion, User, ...) + repository interfaces
├── application/         # Use cases — orchestrate domain operations
├── infrastructure/      # Mongoose models + repository implementations
├── lib/                 # Auth, logger, parse-body, schemas, share-verse, mentions
├── services/            # Client-side service façades (single source of HTTP/Action calls)
├── app/                 # Next.js routes
│   ├── actions/         # Server Actions (comments, discussions, users, moderation, notifications)
│   ├── api/             # Route Handlers (reads + endpoints called by services)
│   ├── (pages)/         # SSR pages: home, profile, chapter, discussion, admin, ...
│   └── _components/     # Shared client components scoped to app/
├── components/          # Reusable presentational components
└── contexts/            # NotificationContext (toasts)
```

**Data flow for mutations** (Server Actions):

```
Client component
  └─> services/{comments,discussions,users,moderation,notifications}.ts
      └─> app/actions/*.ts (use server)
          └─> application/use-cases/*
              └─> infrastructure/repositories/Mongo*Repository
                  └─> Mongoose models
```

**Data flow for reads:** the same services hit `axios.get('/api/...')`,
which lands on a Route Handler that calls a use case. Reads stay on
HTTP because they often run under `cache: "no-store"` in client effects
and don't need the bundle savings of Server Actions.

The discriminated union returned by each Server Action,
`ActionResult<T> = { ok: true, data: T } | { ok: false, error: string }`,
gets translated back to an axios-shaped `Error` by
[`services/_action-error.ts`](./nextjs/src/services/_action-error.ts) so
existing `catch` blocks that read `err.response?.status` keep working.

## Features

- **Bible reading** — 30,000+ verses across 66 books, with comments
  attached per verse or per chapter title
- **Tagged comments** — devotional, exegetical, personal, inspired
  (multi-tag); like / report / edit / delete with owner+moderator gates
- **Discussions** — open-ended threads anchored to a verse, with
  per-answer editing
- **`@mentions`** — parsed in comments and discussion answers; targets
  receive a notification
- **Notification feed** — bell with badge in Header, polling every 60s,
  mark-as-read on click + mark-all-read
- **Moderation panel** at `/admin/moderation` — reports list, clear
  reports, delete comment, promote/demote moderators by email
- **Profile** — user comments + favorites tabs, profile fields
  (belief, state), change password, delete account
- **Search** — unified endpoint `/api/search/unified` covering verses,
  comments, and users; debounced header dropdown
- **Copy verse with reference** to clipboard
- **Dark mode** + adjustable text size (persisted in `localStorage`)
- **Mobile responsive** — sidebar drawer, swipe between chapters,
  keyboard nav (← / → / Esc) on the chapter page
- **SEO** — `generateMetadata` per page, `app/sitemap.ts`,
  `app/robots.ts`, OG/Twitter cards

## Getting started

```bash
cd nextjs
cp .env.local.example .env.local     # set MONGODB_URI, NEXTAUTH_SECRET
npm install
npm run dev                          # http://localhost:5000 (with mongodb-memory-server)
```

`npm run dev` orchestrates an in-memory Mongo instance and pipes its
URI into the Next.js process — no Docker needed for local development.

Run the unit tests:

```bash
npm test
```

Run the Cypress integration suite end-to-end with the same in-memory
Mongo:

```bash
npm run cy:test          # headless (CI-equivalent)
npm run cy:test:dev      # interactive (next dev + cypress open)
```

See [`nextjs/cypress/README.md`](./nextjs/cypress/README.md) for the
full Cypress setup, fixtures, and which specs are wired up.

Bundle analysis:

```bash
npm run analyze          # writes HTML report under .next/analyze/
```

## History

The original architecture (a Python web scraper, a CRA + Material UI
React frontend in `frontend/`, an Express + SQLite backend in
`backend/`) was migrated fully to Next.js + MongoDB. The legacy
directories were removed once feature parity hit 100%. The SQLite
snapshot used to seed the new database is preserved at
[`nextjs/scripts/legacy-data/db.sqlite`](./nextjs/scripts/legacy-data)
and the migration script lives at
[`nextjs/scripts/migrate-sqlite-to-mongo.js`](./nextjs/scripts/migrate-sqlite-to-mongo.js).
The Python scraper that originally populated the SQLite remains in
[`scrapy/`](./scrapy).

---

A Program ~~Violin~~ for His Glory ~ Jennifer Jeon <3
