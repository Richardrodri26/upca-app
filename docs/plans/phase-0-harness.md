# Phase 0: Project Harness

## Objective
Set up the development infrastructure: Docker for PostgreSQL, Prisma v7 ORM, shadcn/ui component library, TanStack Query/Form, environment configuration, and the folder structure that will house all future features.

## Prerequisites
- Node.js 18+ and pnpm installed
- Docker Desktop installed and running
- The Next.js project from `create-next-app` already exists (initial commit)

## Steps

### Step 0.1: Docker Compose for PostgreSQL
**Files**: `docker-compose.yml`
**Action**: Create a Docker Compose file for the development database.
**Details**:
- Use PostgreSQL 16 (`postgres:16-alpine` image)
- Service name: `db`
- Port mapping: `5432:5432`
- Environment: `POSTGRES_DB=upca_dev`, `POSTGRES_USER=upca`, `POSTGRES_PASSWORD=upca_dev_pass`
- Named volume `pgdata` for persistence
- Add a healthcheck using `pg_isready`
- Verify with `docker compose up -d` and confirm the container is healthy

### Step 0.2: Prisma v7 Setup
**Files**: `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`, `.env`
**Action**: Install and configure Prisma v7 with the PostgreSQL driver adapter.
**Details**:
- Install runtime deps: `pnpm add @prisma/client @prisma/adapter-pg pg`
- Install dev deps: `pnpm add -D prisma tsx @types/pg dotenv`
- Initialize: `npx prisma init --output ../src/generated/prisma`
- Update `prisma/schema.prisma`:
  - Set generator `client` to `prisma-client` provider
  - Set output to `"../src/generated/prisma"`
  - Datasource `db` with `postgresql` provider and `env("DATABASE_URL")`
- Create `prisma.config.ts` at project root:
  - Import `defineConfig` from `prisma/config`
  - Import dotenv and call `dotenv.config()`
  - Export defineConfig with `earlyAccess: true` and `schema: './prisma/schema.prisma'`
- Create `src/lib/prisma.ts`:
  - Import `PrismaClient` from `@/generated/prisma`
  - Import `PrismaPg` from `@prisma/adapter-pg`
  - Import `Pool` from `pg`
  - Create a pg Pool with `DATABASE_URL`
  - Instantiate PrismaClient with `adapter: new PrismaPg(pool)`
  - Use the global singleton pattern to avoid multiple instances in development
- Add to `.env`: `DATABASE_URL=postgresql://upca:upca_dev_pass@localhost:5432/upca_dev`
- IMPORTANT Prisma v7 notes: ESM output, driver adapters are required (no built-in engine), env vars are NOT auto-loaded (hence dotenv in config)

### Step 0.3: shadcn/ui Initialization
**Files**: `components.json`, `tailwind.config.ts` (modified), `src/components/ui/*` (generated)
**Action**: Initialize shadcn/ui and install the baseline component set.
**Details**:
- Run `pnpm dlx shadcn@latest init`
- Select: New York style, Slate base color, CSS variables enabled
- This auto-creates `components.json` and updates Tailwind config with CSS variable theme
- Install components in one batch:
  ```
  pnpm dlx shadcn@latest add button input label card dialog table badge select textarea tabs separator avatar dropdown-menu sheet sidebar
  ```
- Verify components exist under `src/components/ui/`

### Step 0.4: TanStack Query and Form Setup
**Files**: `src/lib/query-client.ts`, `src/components/providers.tsx`
**Action**: Install TanStack Query and Form, create the app-wide provider.
**Details**:
- Install: `pnpm add @tanstack/react-query @tanstack/react-form zod`
- Create `src/lib/query-client.ts`:
  - Export a `getQueryClient()` function that returns a singleton QueryClient
  - Default options: `staleTime: 60 * 1000` (1 minute), `retry: 1`
- Create `src/components/providers.tsx`:
  - Mark as `"use client"`
  - Wrap children in `<QueryClientProvider client={getQueryClient()}>`
  - Export as default `Providers` component
- Import and wrap `<Providers>` in the root layout (`src/app/layout.tsx`)

### Step 0.5: Folder Structure
**Files**: Multiple directories and placeholder files
**Action**: Create the directory skeleton for features, components, and shared utilities.
**Details**:
- Create directories:
  - `src/components/atoms/`
  - `src/components/molecules/`
  - `src/components/organisms/`
  - `src/components/templates/`
  - `src/features/auth/components/`
  - `src/features/evaluations/components/`
  - `src/features/manuals/components/`
  - `src/features/results/components/`
  - `src/features/positions/components/`
  - `src/lib/validators/`
  - `src/types/`
- Create empty `index.ts` barrel files in each `src/features/*/` directory
- Create empty `index.ts` in `src/lib/validators/`

### Step 0.6: Environment Configuration
**Files**: `.env.example`, `.gitignore` (verify), `src/types/env.d.ts`
**Action**: Document all required environment variables and add TypeScript type declarations.
**Details**:
- Create `.env.example`:
  ```
  DATABASE_URL=postgresql://upca:upca_dev_pass@localhost:5432/upca_dev
  BETTER_AUTH_SECRET=
  BETTER_AUTH_URL=http://localhost:3000
  RAG_SERVICE_URL=http://localhost:8000
  MOCK_RAG=false
  ```
- Verify `.env` is listed in `.gitignore` (Next.js includes `.env*.local` by default but we need `.env` itself)
- Create `src/types/env.d.ts`:
  ```typescript
  declare namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;
      RAG_SERVICE_URL: string;
      MOCK_RAG?: string;
    }
  }
  ```

## Completion Criteria
- [ ] `docker compose up -d` starts PostgreSQL and the container is healthy
- [ ] `npx prisma generate` runs without errors
- [ ] shadcn/ui components are available under `src/components/ui/`
- [ ] TanStack Query provider wraps the app in root layout
- [ ] All feature directories and placeholder files exist
- [ ] `.env.example` documents all required variables
- [ ] Environment variables have TypeScript type declarations

## RAG Integration Notes
No RAG integration in this phase. The `RAG_SERVICE_URL` env var is declared but not used yet.

## Notes
- Prisma v7 is a significant departure from v5/v6. Driver adapters are mandatory, there is no built-in query engine binary, and the client output is ESM. Do NOT follow Prisma v5 patterns.
- The `prisma.config.ts` file is new to v7 and replaces some of what `schema.prisma` used to handle (like env loading).
- shadcn/ui components are copied into the project (not installed as a package). They live in `src/components/ui/` and can be freely modified.
- TanStack Form is chosen over react-hook-form for its first-class TypeScript support and framework-agnostic design.
