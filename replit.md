# BibleComment - Bible Commentary App

## Overview

A full-stack Bible commentary web application where users can share and read comments on Bible verses. Supports user authentication, commenting on specific Bible passages, discussions, favorites, and user profiles.

## Architecture

### Original Stack (reference, kept running)
- **Frontend**: React (Create React App), port 5000 — workflow "Start application"
- **Backend**: Node.js + Express REST API, port 3000 — workflow "Backend API"
- **Database**: SQLite (pre-populated with 66 books, 30,095 verses, 819 comments, 7 users)

### Next.js Migration (in `nextjs/` directory)
- **Framework**: Next.js 14 (App Router) with TypeScript and Tailwind CSS
- **Database**: MongoDB via Mongoose
- **Auth**: NextAuth v5 (credentials provider)
- **UI**: Tailwind CSS + MUI Material (ThemeProvider)

## Project Structure

```
/
├── frontend/            # Original React CRA app (port 5000)
├── backend/             # Original Express REST API (port 3000)
│   └── src/database/db.sqlite  # SQLite DB (source of truth for migration)
├── nextjs/              # Next.js 14 migration
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── page.tsx          # Root landing page (login + books panel)
│   │   │   ├── home/             # Books listing page
│   │   │   ├── verses/[abbrev]/[number]/  # Chapter reading (renamed from /chapter/)
│   │   │   ├── chapter/          # Redirects to /verses/
│   │   │   ├── discussion/[abbrev]/       # Discussion list for a book
│   │   │   ├── discussion/[abbrev]/[id]/  # Discussion detail
│   │   │   ├── help/             # Help page with sub-components
│   │   │   ├── login/            # Login page
│   │   │   ├── profile/          # User profile
│   │   │   ├── admin/            # Moderator-only admin panel
│   │   │   ├── api/              # API routes (books, comments, discussions, users, search)
│   │   │   └── providers.tsx     # NextAuth + MUI ThemeProvider + context providers
│   │   ├── components/           # Reusable client components
│   │   │   ├── BooksIndex/       # Book chooser + chapter chooser
│   │   │   ├── Comments/         # Side panel comment list
│   │   │   ├── TitleComments/    # Chapter-level comments
│   │   │   ├── AnswerForm/       # Discussion answer form
│   │   │   ├── CommentCard/      # Individual comment card
│   │   │   ├── Header/           # App header with search + nav
│   │   │   ├── Login/            # Login/register form component
│   │   │   ├── Modal/            # Modal wrapper
│   │   │   ├── NewCommentForm/   # New comment creation form
│   │   │   ├── Partials/         # HelpButton, Loading
│   │   │   └── SearchInput/      # Debounced comment search
│   │   ├── services/
│   │   │   ├── api.ts            # Axios client with NextAuth session header
│   │   │   └── auth.ts           # login/logout/useAuth wrappers
│   │   ├── contexts/
│   │   │   ├── NotificationContext.tsx
│   │   │   └── ProfileContext.tsx
│   │   ├── domain/entities/      # TypeScript domain models
│   │   ├── infrastructure/
│   │   │   ├── database/         # MongoDB connection
│   │   │   ├── models/           # Mongoose models
│   │   │   └── repositories/     # Mongo repository implementations
│   │   ├── lib/auth.ts           # NextAuth config
│   │   ├── shared/components/CommentCount/  # Comment count badge
│   │   └── utils/iconFunction.ts # Icon path + date format helpers
│   └── scripts/
│       └── migrate-sqlite-to-mongo.js  # Migration script (npm run migrate:data)
└── scrapy/              # Python web scraping scripts
```

## Workflows

- **Start application**: `cd frontend && npm start` → port 5000 (original React app)
- **Backend API**: `cd backend && node src/server.js` → port 3000 (original Express API)
- Next.js: `cd nextjs && npm run dev` → port 3001 (run manually, would conflict on 5000)

## Key Configuration

- Frontend `.env`: `REACT_APP_BACKEND_URL` points to backend on port 3000
- `DANGEROUSLY_DISABLE_HOST_CHECK=true` enables Replit proxy compatibility
- Backend CORS allows all origins for development
- SQLite database at `backend/src/database/db.sqlite` (pre-populated with data)
- Next.js uses `MONGODB_URI` and `NEXTAUTH_SECRET` env vars

## Data Migration

To migrate SQLite data to MongoDB:
```bash
cd nextjs && npm run migrate:data
```
Migrates all books, verses, users, comments, and discussions with idempotent upserts.

## Dependencies Installation

```bash
# Backend
cd backend && yarn install

# Frontend
cd frontend && npm install --legacy-peer-deps

# Next.js
cd nextjs && npm install
```

## Database

- **Original**: SQLite at `backend/src/database/db.sqlite`. Tables: books, chapters, users, comments, discussion, verses.
- **Next.js**: MongoDB. Collections: books, verses, users, comments, discussions.
- Run original migrations: `cd backend && npx knex migrate:latest`
