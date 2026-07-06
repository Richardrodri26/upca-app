# Plan 006: Fix actively-wrong documentation (RAG contract, AGENTS.md, roadmap, README)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- docs AGENTS.md README.md`
> On mismatch with the excerpts below, re-verify each claim before editing.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

Commit `eb94439` ("integrate real RAG API...") replaced the designed RAG
contract with the teammate's real API — but the docs were never reconciled.
The two most authoritative entry points (`AGENTS.md`, `docs/roadmap.md`) still
route readers to the DEAD contract as "source of truth", `AGENTS.md` documents
an auth helper that does not exist, and `README.md` is untouched
create-next-app boilerplate. Actively-wrong docs are worse than missing ones:
an agent following `AGENTS.md` today will call `requireRole()` (nonexistent)
against endpoints from a superseded contract. This is a thesis project — the
docs will also be read by reviewers.

## Current state

Verified wrong statements, each with its correction:

1. `AGENTS.md` (§ "Auth Pattern"): says
   `Role check: requireRole(session, "HR", "ADMIN") helper`.
   **Reality**: the only helper is `requireAuth(options?: { roles?: Role[] })`
   in `src/lib/auth-middleware.ts:12` (plus `getSession()`); usage is
   `await requireAuth({ roles: ["ADMIN", "HR"] })`.
2. `AGENTS.md` (§ "Critical Documentation" table): lists
   `docs/rag-api-contract.md` as "REST contract with the RAG service. 3
   endpoints, Zod schemas, error codes."
   **Reality**: the live contract is `docs/DOCUMENTACION_API.md` (the
   teammate's real API: `GET /api/cargos`, `POST /api/evaluacion/generar`,
   `POST /api/base_conocimiento/procesar|guardar`, `GET .../contenido`,
   `DELETE .../eliminar`) — matching `src/lib/rag-client.ts`.
3. `AGENTS.md` (§ Tech Stack): "PostgreSQL via Docker (local) / Vercel
   Postgres (prod)". **Reality**: production DB is Neon Postgres (per the
   deploy session; verify with the operator if unsure — see STOP conditions).
4. `docs/rag-api-contract.md:16-40`: documents `POST /api/manuals/ingest`,
   `POST /api/evaluations/generate`, base URL `http://localhost:8000` — all
   superseded.
5. `docs/roadmap.md`: line ~71 references `MOCK_RAG` mock mode (removed from
   `src/lib/rag-client.ts` — grep confirms no `MOCK_RAG` in src); the
   "Coordinacion con companero RAG" table (lines ~135-140) lists RAG as
   `NOT_STARTED` with the old endpoint names; line ~171 says "Vercel
   Postgres"; the knowledge-base feature appears nowhere.
6. `README.md:1-37`: stock create-next-app boilerplate. No project overview,
   no two-service topology, no env vars, no setup steps.
7. No `.env.example` (created by plan 005 — do not duplicate here; just
   reference it from the README if it exists by the time you write it).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm no MOCK_RAG | `grep -rn "MOCK_RAG" src` | no matches |
| Confirm helper name | `grep -n "requireRole\|requireAuth" src/lib/auth-middleware.ts` | only `requireAuth` |
| Markdown sanity | visual review | links resolve, tables render |

## Scope

**In scope**:
- `AGENTS.md`
- `README.md` (full rewrite)
- `docs/roadmap.md` (corrections + one addition)
- `docs/rag-api-contract.md` (supersession banner only)

**Out of scope**:
- `docs/DOCUMENTACION_API.md` — it's the teammate's doc of the real API;
  treat as read-only input.
- `docs/architecture.md`, `docs/erd.md`, `docs/plans/phase-*.md` — historical
  planning docs; not audited line-by-line here, leave them.
- `CLAUDE.md` — one line (`@AGENTS.md`), nothing to fix.
- Deleting `docs/rag-api-contract.md` — banner it instead; it documents the
  original design (thesis-relevant history).

## Git workflow

- Branch: `advisor/006-docs-reconciliation`
- Suggested commit: `docs: reconcile RAG contract references, fix AGENTS.md auth helper, rewrite README`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Banner the superseded contract

At the very top of `docs/rag-api-contract.md`, insert:

```markdown
> ⚠️ **SUPERSEDED (2026-07)** — Este documento describe el contrato DISEÑADO
> originalmente, que nunca se implementó tal cual. El contrato REAL del
> servicio RAG está en [`DOCUMENTACION_API.md`](./DOCUMENTACION_API.md) y su
> cliente en `src/lib/rag-client.ts`. Se conserva como registro de diseño.
```

**Verify**: banner renders as the first block of the file.

### Step 2: Fix AGENTS.md

- Replace the `requireRole(session, "HR", "ADMIN")` line with:
  `Role check: await requireAuth({ roles: ["ADMIN", "HR"] }) from src/lib/auth-middleware.ts`.
- In the Critical Documentation table, change the RAG contract row to point
  to `docs/DOCUMENTACION_API.md` ("Contrato REAL del servicio RAG del
  compañero") and add a note that `rag-api-contract.md` is superseded.
- Fix "Vercel Postgres (prod)" → "Neon Postgres (prod)".
- In "Important Domain Rules" item 5, the statement stays correct (RAG via
  Server Actions only) — leave it.

**Verify**: `grep -n "requireRole" AGENTS.md` → no matches.

### Step 3: Correct roadmap.md

- In "Coordinacion con companero RAG": update the table to reflect the real,
  integrated API (both RAG rows → `DONE`/`INTEGRATED`, endpoint names from
  `DOCUMENTACION_API.md`), and point "Contrato API" at `DOCUMENTACION_API.md`.
- Remove/replace the `MOCK_RAG` notes (the mock mode no longer exists).
- "Notas generales": fix "Vercel Postgres" → "Neon Postgres"; add a dated
  note: knowledge-base feature (gestión de base de conocimientos RAG) added
  post-Phase-6, outside the original phases.

**Verify**: `grep -n "MOCK_RAG" docs/roadmap.md` → no matches (or only inside
a "historial" note explicitly marked as past).

### Step 4: Rewrite README.md

Replace the boilerplate with (structure, in Spanish to match the docs):

1. **Qué es** — Sistema Inteligente de Evaluación de Desempeño (trabajo de
   grado): genera evaluaciones Likert desde manuales de funciones vía RAG.
   Two-service topology: this Next.js app + the teammate's FastAPI RAG service
   (HuggingFace Space).
2. **Stack** — one table (Next.js 16, React 19, Prisma 7, Better Auth, Zod 4,
   TanStack, Tailwind 4, Biome, pnpm, PostgreSQL).
3. **Requisitos** — Node 22+, pnpm, Docker (Postgres local).
4. **Setup** — `pnpm install` → copy `.env.example` to `.env` and fill (list
   each variable NAME with one line of purpose: `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RAG_SERVICE_URL`, `HF_TOKEN` —
   verify the list against `grep -rhoE "process\.env\.[A-Z_]+" src | sort -u`)
   → `docker compose up -d` → `pnpm exec prisma migrate dev` → seed if a seed
   script exists (check `prisma/` and `package.json`) → `pnpm dev`.
5. **Documentación** — table linking `docs/architecture.md`, `docs/erd.md`,
   `docs/DOCUMENTACION_API.md` (contrato RAG real), `docs/roadmap.md`.
6. **Verificación** — `pnpm lint`, `pnpm typecheck`, `pnpm test` (mention
   only the ones that exist when you write this — check `package.json`).

NEVER copy values from `.env`. Names only.

**Verify**: `grep -in "create-next-app\|geist" README.md` → no matches.

## Test plan

Docs-only change. Verification = the grep gates above + link check (every
relative link in the touched files resolves to an existing file).

## Done criteria

- [ ] `grep -n "requireRole" AGENTS.md` → no matches
- [ ] `rag-api-contract.md` starts with the SUPERSEDED banner
- [ ] `grep -rn "MOCK_RAG" docs/roadmap.md` → no live references
- [ ] README describes THIS project (no boilerplate remnants)
- [ ] All relative links in touched files resolve
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- You cannot confirm the production DB provider (Neon vs Vercel Postgres) —
  ask the operator rather than guessing in three files.
- `DOCUMENTACION_API.md` doesn't match `src/lib/rag-client.ts` endpoints —
  that would mean the "real" doc ALSO drifted; report instead of picking one.

## Maintenance notes

- Add to the team habit: when the RAG teammate changes the API, update
  `DOCUMENTACION_API.md` in the same PR that updates `rag-client.ts`.
- Plan 001 adds auth to all reads — after it lands, consider one line in
  AGENTS.md: "Every Server Action starts with requireAuth(...), reads
  included."
