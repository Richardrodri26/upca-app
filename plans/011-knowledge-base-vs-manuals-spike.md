# Plan 011: SPIKE — decide how Knowledge Base and Manuals coexist

> **Executor instructions**: This is a SPIKE plan — the deliverable is a
> DECISION DOCUMENT, not code. Do not modify any source file. Follow the
> investigation steps, produce the document, and stop. When done, update the
> status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git status --short src/features/knowledge-base src/features/manuals`
> This plan was written while the knowledge-base feature was UNCOMMITTED. If
> it has since been committed/reworked, note that in the deliverable.

## Status

- **Priority**: P3
- **Effort**: M (mostly thinking + writing; zero code)
- **Risk**: LOW (no code changes)
- **Depends on**: none. **Blocks**: the final shape of plan 008 (sync
  consolidation) — ideally run this spike first or in parallel.
- **Category**: direction
- **Planned at**: commit `6674b8e` (+ uncommitted working tree), 2026-07-05

## Why this matters

The repo now has TWO ways to register a cargo (position) and its manual, built
at different times, writing the same DB tables through different code paths:

1. **Manuals flow** (`src/features/manuals/`, route `/manuals`): user picks an
   EXISTING Position, `registerManual` verifies the cargo is already indexed
   in the RAG service, flips a Manual row to PROCESSED. The RAG-side document
   was uploaded by the teammate out-of-band.
2. **Knowledge Base flow** (`src/features/knowledge-base/`, route
   `/knowledge-base`, uncommitted): user uploads PDF/DOCX → RAG processes to
   markdown → user reviews/edits → save creates the RAG entry AND
   auto-creates Position + Manual rows in the app DB ("best-effort", errors
   swallowed).

Nobody has decided whether KB replaces Manuals or complements it. Left
unresolved: duplicate surface area, divergent sync code (plan 008 treats the
symptom), a roadmap that doesn't mention KB at all, and a confusing HR story
("¿dónde cargo un manual?"). One decision, written down, unblocks the cleanup.

## Current state (evidence to reason from)

- KB actions: `src/features/knowledge-base/actions.ts` — `procesarDocumento`
  (upload→markdown), `guardarCargo` (save to RAG + best-effort DB sync,
  `catch {}` at :103-105), `obtenerContenidoCargo`, `eliminarCargo` (blocks
  deletion when ACTIVE/REVIEW evaluations exist, :127-140),
  `getKnowledgeBaseCargos`.
- Manuals actions: `src/features/manuals/actions.ts` — `registerManual`
  (:37-91, existence-check flow), `syncManualsWithRag` (:93-101, bulk pull),
  `deleteManual` (:103-128).
- Both were modified in the same working session (git status showed
  `upload-dialog.tsx` modified alongside the new KB feature) — evidence the
  author was already migrating flows.
- Sidebar (`src/components/dashboard/app-sidebar.tsx`) was modified to add the
  KB section — check what both nav entries currently look like.
- Domain rule (AGENTS.md): Manual↔Position is 1:1.
- The KB flow is the only one that can CREATE positions (with department
  `"Sin departamento"`), bypassing the positions CRUD's validated form
  (`src/features/positions/` has Zod-validated create with department).

## Deliverable

`docs/decisions/knowledge-base-vs-manuals.md` (create the directory), ≤ 2
pages, structure:

1. **Contexto** — the two flows, one paragraph each, with file references.
2. **Opciones** (analyze exactly these three):
   - **A. KB replaces Manuals**: `/manuals` page retired; Manual rows become
     an implementation detail synced from RAG. Cost: rework `/manuals`
     consumers (evaluations generation reads `getPositionsWithProcessedManual`);
     the "register existing cargo" path needs a KB equivalent.
   - **B. Manuals absorbs KB**: KB's upload→review→save wizard moves INTO the
     manuals feature as the upload path; `/knowledge-base` route retired.
   - **C. Both stay, roles split**: KB = document/content management (RAG
     store), Manuals = app-side registry view (read-only + sync button).
     Cost: permanent duplicate mental model — needs an explicit rule for
     which flow creates Positions.
3. **Recomendación** — pick ONE, justify in ≤ 5 sentences, list the follow-up
   code tasks it implies (each as a one-line item; they become future plans).
4. **Implicaciones para el plan 008** — which sync paths survive under the
   recommendation.
5. **Decisión pendiente del equipo** — the department-data question (KB
   creates positions with a placeholder department; the positions form
   requires a real one — who fills it in, when?).

## Investigation steps

### Step 1: Read both features end-to-end

All files under `src/features/knowledge-base/` and `src/features/manuals/`
(components included), plus `src/app/(dashboard)/knowledge-base/` and
`src/app/(dashboard)/manuals/`, plus the sidebar. Map: which