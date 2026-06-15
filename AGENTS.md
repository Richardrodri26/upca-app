<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UPCA App — Agent Context

## Project Overview

**Sistema Inteligente de Evaluacion de Desempeno** — A Next.js web app that generates Likert-scale performance evaluations from job function manuals using AI (RAG). This app is the frontend/web layer. A separate RAG service (FastAPI/Python by a teammate) handles document ingestion and question generation via Ollama + ChromaDB.

## Critical Documentation — READ BEFORE CODING

| Document | Path | What it contains |
|----------|------|-----------------|
| **Architecture** | `docs/architecture.md` | Stack, layers, folder structure, conventions, naming, security, tradeoffs. READ THIS FIRST. |
| **ERD** | `docs/erd.md` | Mermaid entity-relationship diagram. 9 entities. Source of truth for the data model. |
| **RAG API Contract** | `docs/rag-api-contract.md` | REST contract with the RAG service. 3 endpoints, Zod schemas, error codes. |
| **Roadmap** | `docs/roadmap.md` | Phase tracker with checkboxes. Update `- [ ]` to `- [x]` and status when completing work. |
| **Phase Plans** | `docs/plans/phase-{0..6}-*.md` | Step-by-step implementation plans per phase. Check which phase is current in roadmap.md. |

## Tech Stack (non-negotiable)

- **Next.js 16.2.9** (App Router) + **React 19** + **TypeScript 5.x**
- **Prisma 7.x** — ESM, driver adapters (`@prisma/adapter-pg`), `prisma.config.ts` required, client generated in `src/generated/prisma/`
- **Better Auth** — Prisma adapter, email/password, 3 roles (ADMIN, HR, EMPLOYEE) via simple enum field
- **Zod** — ALL inputs, outputs, and API responses validated
- **TanStack Form** — ALL forms (no raw useState for form fields)
- **TanStack Query** — ALL data fetching (no useEffect fetching)
- **shadcn/ui** — Installed via CLI to `src/components/ui/`. Do NOT npm install component packages.
- **Tailwind CSS 4** + **Biome 2.2.0** (no ESLint, no Prettier)
- **PostgreSQL** via Docker (local) / Vercel Postgres (prod)
- **pnpm** as package manager

## Project Structure

```
src/
├── app/                    # Next.js App Router (routes only, minimal logic)
│   ├── (auth)/             # Public: sign-in, sign-up
│   ├── (dashboard)/        # Protected: all authenticated pages
│   └── api/auth/[...all]/  # Better Auth catch-all
├── components/             # Atomic Design (SHARED/reusable)
│   ├── ui/                 # shadcn/ui (generated, don't modify directly)
│   ├── atoms/              # Smallest custom units
│   ├── molecules/          # Compositions of atoms
│   ├── organisms/          # Complex stateful sections
│   └── templates/          # Page-level layouts
├── features/               # Feature modules (domain logic)
│   ├── {feature}/
│   │   ├── components/     # Feature-EXCLUSIVE components
│   │   ├── hooks/          # Custom hooks, TanStack Query
│   │   ├── actions.ts      # Server Actions
│   │   ├── validators.ts   # Zod schemas
│   │   └── types.ts
├── lib/                    # Shared infrastructure
│   ├── auth.ts             # Better Auth server config
│   ├── auth-client.ts      # Better Auth client
│   ├── prisma.ts           # Prisma singleton (PrismaPg adapter)
│   ├── rag-client.ts       # HTTP client for RAG service
│   └── validators/         # Shared Zod schemas
├── generated/prisma/       # Prisma v7 generated client (don't edit)
└── types/                  # Global types
```

## Key Conventions

### Naming
- Files: `kebab-case` (evaluation-card.tsx, use-positions.ts)
- Components: `PascalCase` (EvaluationCard)
- Hooks: `camelCase` with `use` prefix (usePositions)
- Server Actions: `camelCase` verbs (createPosition)
- Zod schemas: `PascalCase` + `Schema` suffix (CreatePositionSchema)

### Component Organization
- **Shared/reusable** components → `src/components/` (atomic design)
- **Feature-exclusive** components → `src/features/{feature}/components/`
- If a feature component needs to be shared, promote it to `src/components/`

### Data Flow
```
Component (TanStack Form) → Feature Hook (TanStack Query) → Server Action (Zod validation) → Prisma → PostgreSQL
                                                          → RAG Client → RAG Service (HTTP)
```

### Auth Pattern
- Server: `auth.api.getSession({ headers })` in Server Actions
- Client: `useSession()` from `src/lib/auth-client.ts`
- Role check: `requireRole(session, "HR", "ADMIN")` helper
- Route protection via middleware or layout-level session check

### Validation
- ALL user inputs validated with Zod BEFORE processing
- ALL RAG API responses validated with Zod on receipt
- Feature schemas in `features/{name}/validators.ts`, shared in `lib/validators/`

## Data Model Summary

9 entities (see `docs/erd.md` for full diagram):
- **User** (Better Auth + `role` enum), **Session**, **Account**, **Verification** — auth tables
- **Position** — job positions (cargo)
- **Manual** — uploaded job function manuals (metadata only, RAG processes the file)
- **Evaluation** — generated evaluation (DRAFT → REVIEW → ACTIVE → CLOSED)
- **Question** — AI-generated Likert questions (flat list, no categories). Has 3 IAP rating fields (relevanceRating, coherenceRating, adequacyRating) for HR quality review.
- **EvaluationAssignment** — links evaluation to employee. Pre-calculated `score` on completion.
- **Response** — employee's Likert answer (1-5) per question

## Important Domain Rules

1. **Questions have NO dimension/category field.** They are a flat list. The only "dimensions" are the 3 IAP rating fields (pertinencia, coherencia, adecuacion) that HR rates during review.
2. **Manual → Position is 1:1.** One manual per position.
3. **Evaluation can only be activated when ALL questions are reviewed** (approved or edited, not pending/rejected).
4. **Employee self-evaluation only** (not 360-degree).
5. **RAG service is external HTTP.** Never expose it to the browser. All calls go through Server Actions.
6. **MOCK_RAG=true** env var enables mock responses for development without the RAG service.

## Prisma v7 Specifics

- Generator: `prisma-client` (NOT `prisma-client-js`)
- Output: `"../src/generated/prisma"` (MANDATORY)
- Import: `import { PrismaClient } from "@/generated/prisma/client"`
- Driver adapter: `@prisma/adapter-pg` required
- Config: `prisma.config.ts` at project root
- Env vars NOT auto-loaded — needs dotenv

## Workflow — Updating Progress

After completing any step or phase:
1. Update `docs/roadmap.md` — mark checkbox `- [x]` and change phase status
2. If you made an important decision, save to engram via `mem_save`
3. Check the current phase plan in `docs/plans/` for next steps
