# Train Dirty - Workout Tracker

## Overview

Next.js 15 App Router workout tracking application with AMOLED dark theme. All code lives at the root directory (no `src` folder).

## Stack

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) via Drizzle ORM + `pg` driver
- **Styling**: TailwindCSS v4 with `@tailwindcss/postcss`, AMOLED pure black theme
- **Fonts**: Inter (body), Outfit (display headings)
- **UI**: Radix UI primitives, Lucide icons, Framer Motion
- **State**: TanStack Query v5, Orval-generated React Query hooks
- **Auth**: Master Password + PIN (scrypt hashing, session cookies)

## Structure

```text
/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── globals.css         # Global styles + Tailwind
│   ├── page.tsx            # Home page
│   ├── log/page.tsx        # Workout log
│   ├── timer/page.tsx      # Rest timer
│   ├── stats/page.tsx      # Statistics
│   ├── profile/page.tsx    # Profile/auth
│   └── api/                # API route handlers
│       ├── healthz/
│       ├── auth/           # Auth routes (user, login, logout)
│       ├── workout-plans/
│       ├── exercises/
│       ├── sessions/       # Sessions CRUD + sets
│       ├── stats/          # Stats endpoints
│       ├── profile/
│       └── admin/
├── components/             # Shared UI components
├── lib/
│   ├── auth.ts             # Session/auth utilities
│   ├── utils.ts            # cn() utility
│   ├── timer-context.tsx   # Timer React context
│   ├── providers.tsx       # QueryClientProvider wrapper
│   ├── db/                 # Database layer (Drizzle ORM)
│   │   ├── index.ts        # Pool + Drizzle instance
│   │   └── schema/         # Table definitions
│   ├── api-client-react/   # Generated React Query hooks (Orval)
│   └── api-zod/            # Generated Zod schemas (Orval)
├── public/                 # Static assets
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── artifacts/web/          # Minimal artifact registration (just .replit-artifact/)
```

## Key Details

- **Database**: Connection via `NEON_DATABASE_URL` env var
- **Auth**: Admin password "Malakar@22", session cookie "sid", TTL 7 days
- **All pages**: Use `"use client"` directive with client-side routing
- **API imports**: `@/lib/db` for database, `@/lib/api-client-react` for hooks, `@/lib/api-zod` for validation schemas
- **Dev server**: Runs on port from `PORT` env var (default 3000)
