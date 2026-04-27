<p align="center">
  <img src=".github/title.png">
</p>

> A web site to read and share comments about Bible verses.

<p align="center">
  <img src="https://img.shields.io/badge/-Next.js-black?style=flat&logo=next.js"/>
  <img src="https://img.shields.io/badge/-MongoDB-black?style=flat&logo=mongodb"/>
  <img src="https://img.shields.io/badge/-NextAuth-black?style=flat&logo=auth0"/>
  <img src="https://img.shields.io/badge/-Cypress-black?style=flat&logo=cypress"/>
</p>

<p align="center">
  <img alt="ADM" src=".github/index.png">
</p>

## Motivation

This project started in 2020 as a place to share interpretations of the
Bible and answer difficult verses, born from personal note-taking on
Bible margins. It now lives as a Next.js + MongoDB application under
[`nextjs/`](./nextjs).

## Stack

- **Next.js 14** (App Router) — pages, server components, route handlers
- **MongoDB** via Mongoose — persistence layer
- **NextAuth.js v5** — credentials auth, MD5 → bcrypt upgrade on first
  login from legacy data
- **TailwindCSS 4** — styling
- **Vitest** — unit tests (use cases + helpers, ~56 tests)
- **Cypress** — integration + E2E (auth, RBAC, comments, discussions,
  notifications, mentions, search, SEO; ~63 tests)
- **pino** — structured server logs
- **Sentry** — optional error reporting (no-op without `SENTRY_DSN`)

## Getting started

```bash
cd nextjs
cp .env.local.example .env.local   # edit MONGODB_URI / NEXTAUTH_SECRET
npm install
npm run dev                          # http://localhost:5000
```

Run the unit tests:

```bash
npm test
```

Run the Cypress integration suite end-to-end with an in-memory Mongo:

```bash
npm run cy:test          # headless (CI-equivalent)
npm run cy:test:dev      # interactive (next dev + cypress open)
```

See [`nextjs/cypress/README.md`](./nextjs/cypress/README.md) for the
full Cypress setup, fixtures, and which specs are wired up.

## History

The original architecture (a Python webscraper, a React frontend in
`frontend/`, an Express + SQLite backend in `backend/`) was migrated
fully to Next.js + MongoDB. The legacy directories were removed; the
SQLite snapshot used to seed the new database is preserved at
[`nextjs/scripts/legacy-data/db.sqlite`](./nextjs/scripts/legacy-data)
and the migration script lives at
[`nextjs/scripts/migrate-sqlite-to-mongo.js`](./nextjs/scripts/migrate-sqlite-to-mongo.js).
The Python scraper that originally populated the SQLite remains in
[`scrapy/`](./scrapy).

---

A Program ~~Violin~~ for His Glory ~ Jennifer Jeon <3
