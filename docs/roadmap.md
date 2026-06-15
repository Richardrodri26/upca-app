# UPCA App — Roadmap

**Proyecto**: Sistema Inteligente de Evaluacion de Desempeno
**Inicio**: 2026-06-15
**Estado general**: EN PLANIFICACION

---

## Fases

### Phase 0: Project Harness `NOT_STARTED`

**Plan**: [docs/plans/phase-0-harness.md](./plans/phase-0-harness.md)

- [ ] 0.1 Docker Compose (PostgreSQL)
- [ ] 0.2 Prisma v7 setup (schema, config, client)
- [ ] 0.3 shadcn/ui initialization + base components
- [ ] 0.4 TanStack Query & Form setup
- [ ] 0.5 Folder structure (atomic design + features)
- [ ] 0.6 Environment configuration (.env, types)

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

### Phase 1: Authentication `NOT_STARTED`

**Plan**: [docs/plans/phase-1-auth.md](./plans/phase-1-auth.md)
**Depende de**: Phase 0

- [ ] 1.1 Better Auth installation + secret
- [ ] 1.2 Auth configuration (server + client)
- [ ] 1.3 Prisma schema — auth models + role enum
- [ ] 1.4 API route ([...all])
- [ ] 1.5 Auth middleware + requireRole helper
- [ ] 1.6 Auth pages (sign-in, sign-up)
- [ ] 1.7 Dashboard layout shell

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

### Phase 2: Core Schema & Seed `NOT_STARTED`

**Plan**: [docs/plans/phase-2-schema.md](./plans/phase-2-schema.md)
**Depende de**: Phase 1

- [ ] 2.1 Complete Prisma schema (all models + enums)
- [ ] 2.2 Migration
- [ ] 2.3 Seed data (users, positions, manuals, evaluations)
- [ ] 2.4 Zod schemas for domain models

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

### Phase 3: Positions & Manuals `NOT_STARTED`

**Plan**: [docs/plans/phase-3-positions-manuals.md](./plans/phase-3-positions-manuals.md)
**Depende de**: Phase 2
**RAG**: Parcial — upload funciona sin RAG, ingesta necesita RAG o mock

- [ ] 3.1 RAG service client (src/lib/rag-client.ts)
- [ ] 3.2 Position feature (queries, mutations, actions)
- [ ] 3.3 Position pages (list, detail, form dialog)
- [ ] 3.4 Manual feature (queries, mutations, actions)
- [ ] 3.5 Manual pages (list, upload dialog, status badges)
- [ ] 3.6 Mock RAG service (MOCK_RAG env var)

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

### Phase 4: Evaluation Generation & HR Review `NOT_STARTED`

**Plan**: [docs/plans/phase-4-evaluations.md](./plans/phase-4-evaluations.md)
**Depende de**: Phase 3
**RAG**: Parcial — generacion necesita RAG o mock, review UI no depende

- [ ] 4.1 RAG generation client extension
- [ ] 4.2 Evaluation feature (queries, mutations)
- [ ] 4.3 Evaluation actions (server)
- [ ] 4.4 Generation page (select position, trigger RAG)
- [ ] 4.5 Review page (question cards, ratings, approve/reject)
- [ ] 4.6 Evaluations list page
- [ ] 4.7 Zod schemas for evaluations

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

### Phase 5: Assignment & Employee Response `NOT_STARTED`

**Plan**: [docs/plans/phase-5-assignments.md](./plans/phase-5-assignments.md)
**Depende de**: Phase 4
**RAG**: No

- [ ] 5.1 Assignment feature (queries, mutations)
- [ ] 5.2 Assignment actions (server)
- [ ] 5.3 Assignment page — HR view (employee selector, table)
- [ ] 5.4 Employee response page (Likert form, progress bar)
- [ ] 5.5 Zod schemas for assignments

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

### Phase 6: Results & Dashboard `NOT_STARTED`

**Plan**: [docs/plans/phase-6-results.md](./plans/phase-6-results.md)
**Depende de**: Phase 5
**RAG**: No

- [ ] 6.1 Results feature (queries)
- [ ] 6.2 Results actions (server — aggregations)
- [ ] 6.3 Main dashboard page (stats, tables, role-based views)
- [ ] 6.4 Evaluation results page (per-employee, per-question)
- [ ] 6.5 Employee results detail (individual scores)
- [ ] 6.6 Export placeholder button
- [ ] 6.7 IAP & IRTO calculation utilities

**Notas**:
<!-- Agregar notas de esta fase aqui -->

---

## Coordinacion con companero RAG

| Fase nuestra | Que necesitamos del RAG | Estado RAG |
|--------------|------------------------|------------|
| Phase 0-2 | Nada — usamos mock | N/A |
| Phase 3 | POST /api/manuals/ingest | NOT_STARTED |
| Phase 4 | POST /api/evaluations/generate | NOT_STARTED |
| Phase 5-6 | Nada — datos ya en nuestra DB | N/A |

**Guia para el companero**: [docs/rag-teammate-guide.md](./rag-teammate-guide.md)
**Contrato API**: [docs/rag-api-contract.md](./rag-api-contract.md)

---

## Documentacion

| Documento | Archivo | Estado |
|-----------|---------|--------|
| Arquitectura | [docs/architecture.md](./architecture.md) | COMPLETADO |
| ERD (modelo de datos) | [docs/erd.md](./erd.md) | COMPLETADO |
| Contrato API RAG | [docs/rag-api-contract.md](./rag-api-contract.md) | COMPLETADO |
| Guia companero RAG | [docs/rag-teammate-guide.md](./rag-teammate-guide.md) | COMPLETADO |
| Plan fase 0 | [docs/plans/phase-0-harness.md](./plans/phase-0-harness.md) | COMPLETADO |
| Plan fase 1 | [docs/plans/phase-1-auth.md](./plans/phase-1-auth.md) | COMPLETADO |
| Plan fase 2 | [docs/plans/phase-2-schema.md](./plans/phase-2-schema.md) | COMPLETADO |
| Plan fase 3 | [docs/plans/phase-3-positions-manuals.md](./plans/phase-3-positions-manuals.md) | COMPLETADO |
| Plan fase 4 | [docs/plans/phase-4-evaluations.md](./plans/phase-4-evaluations.md) | COMPLETADO |
| Plan fase 5 | [docs/plans/phase-5-assignments.md](./plans/phase-5-assignments.md) | COMPLETADO |
| Plan fase 6 | [docs/plans/phase-6-results.md](./plans/phase-6-results.md) | COMPLETADO |

---

## Notas generales
<!-- Notas libres sobre el proyecto, decisiones, problemas, etc. -->

- 2026-06-15: Inicio de planificacion. Stack definido, arquitectura confirmada, ERD aprobado.
- Prisma v7 tiene breaking changes: ESM, driver adapters, prisma.config.ts obligatorio. Ver docs/architecture.md.
- RAG service es HTTP separado (FastAPI/Python). Mock disponible via MOCK_RAG=true.
- Deploy: Vercel + Vercel Postgres. Se configura al final del proyecto.
