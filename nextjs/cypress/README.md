# Cypress test suite

Integration + E2E tests for the Next.js app. Vitest (`npm test`) covers pure
logic via mocks; Cypress covers what mocks can't — full HTTP roundtrip,
NextAuth session cookies, hydration, and Mongo persistence.

## Prerequisites

You need a separate Mongo database for tests. **Never point Cypress at
production Mongo** — the `db:reset` task wipes collections at the start
of every spec.

The DB task in `cypress/tasks/db.ts` refuses to connect if `MONGODB_URI`
ends in `/biblecomment` (the prod database name).

### Local

Either run a local Mongo (`docker run -d -p 27017:27017 mongo:7`) and set:

```
MONGODB_URI=mongodb://localhost:27017/biblecomment-cypress
NEXTAUTH_SECRET=any-non-empty-string-for-tests
NEXTAUTH_URL=http://localhost:5000
```

…or point at a separate Atlas database (NOT the prod one).

## Running

The fastest path is the all-in-one command. It boots an in-process
Mongo (no docker), exports the env vars, builds + starts Next.js, runs
Cypress, and tears everything down — exits with the cypress exit code.

```bash
# Headless full pipeline (CI-equivalent). ~1-2 min cold; ~30s after build cache.
npm run cy:test          # or: yarn cy:test

# Interactive (next dev + cypress open). Live reloads, slower spec startup.
npm run cy:test:dev

# Already have a server up? Skip the orchestrator and run cypress only.
npm run cy:open
npm run cy:run
npx cypress run --spec cypress/e2e/idor-and-rbac.cy.ts
```

The first time `cy:test` runs it will download a Mongo binary (~80MB)
to `%LOCALAPPDATA%\.cache\mongodb-binaries` (Windows) or
`~/.cache/mongodb-binaries` (Linux/macOS). Cached for subsequent runs.

If you'd rather use a Mongo you already have running (faster, no
download), set `MONGODB_URI` yourself and use `cy:open` / `cy:run`
directly.

## Specs

Status snapshot — keep this in sync as you fill in stubs:

| Spec                       | Status      | Coverage                                                                |
| -------------------------- | ----------- | ----------------------------------------------------------------------- |
| `idor-and-rbac.cy.ts`      | implemented | Locks the 3 original security fixes + CR-1 unique username.             |
| `auth.cy.ts`               | implemented | Register / login (UI + API) / private route guard / logout.             |
| `comments.cy.ts`           | stub        | Owner / non-owner / moderator lifecycle, like/report toggles.           |
| `discussions.cy.ts`        | stub        | Create / answer / owner notification.                                   |
| `mentions.cy.ts`           | stub        | `@username` parser → notification creation; ghost / self filter.        |
| `moderation.cy.ts`         | stub        | RBAC on `/api/moderation/reports`; clear reports; promote moderator.    |
| `search.cy.ts`             | stub        | Debounce; unified verse + comment results; navigation on click.         |

Implemented specs run in CI on every push to `feat/**` and `master`;
stubs use `describe.skip()` so they don't fail the build until you fill
them in.

## Helpers

`cypress/support/commands.ts`:

- `cy.resetDb()` — wipes all collections on the test DB. Call in `beforeEach`.
- `cy.seedDb({ users, books, verses })` — bulk-insert fixtures. Bcrypt-hashes
  passwords automatically.
- `cy.loginAs(email, password)` — programmatic NextAuth login (no UI). Sets
  the session cookie on the test browser context. Much faster than
  navigating `/login` for every test; use it unless you're explicitly
  testing the login form.

`cypress/fixtures/`:

- `users.json` — alice (regular), bob (regular), mod (moderator).
  Passwords are plain-text here; `seedDb` hashes them on insert.
- `book-gn.json` — Gênesis with 3 seed verses.

## When tests fail in CI

GitHub Actions uploads `cypress/screenshots/` on failure (7-day retention).
Pull the artifact, look at the file with the spec name in it.
