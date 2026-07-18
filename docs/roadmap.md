# UPCA App — Roadmap

**Proyecto**: Sistema Inteligente de Evaluacion de Desempeno
**Inicio**: 2026-06-15
**Estado general**: COMPLETADO — Todas las fases (0-6) finalizadas ✅ — Feature adicional: Two Reviewer Calibration ✅

---

## Fases

### Phase 0: Project Harness `COMPLETED`

**Plan**: [docs/plans/phase-0-harness.md](./plans/phase-0-harness.md)

- [x] 0.1 Docker Compose (PostgreSQL)
- [x] 0.2 Prisma v7 setup (schema, config, client)
- [x] 0.3 shadcn/ui initialization + base components
- [x] 0.4 TanStack Query & Form setup
- [x] 0.5 Folder structure (atomic design + features)
- [x] 0.6 Environment configuration (.env, types)

**Notas**:
- 2026-06-15: Phase 0 completado. Prisma v7.8.0 genera OK. 17 componentes shadcn/ui instalados. TanStack Query 5 + Form 1 + Zod 4 configurados.

---

### Phase 1: Authentication `COMPLETED`

**Plan**: [docs/plans/phase-1-auth.md](./plans/phase-1-auth.md)
**Depende de**: Phase 0

- [x] 1.1 Better Auth installation + secret
- [x] 1.2 Auth configuration (server + client)
- [x] 1.3 Prisma schema — auth models + role enum
- [x] 1.4 API route ([...all])
- [x] 1.5 Auth middleware + requireRole helper
- [x] 1.6 Auth pages (sign-in, sign-up)
- [x] 1.7 Dashboard layout shell

**Notas**:
- 2026-06-15: Phase 1 completado. Better Auth 1.6.18 con Prisma adapter. Migración auth-models aplicada con Role enum. Páginas sign-in/sign-up con TanStack Form + Zod 4 (validación manual). Dashboard layout con shadcn Sidebar (Base UI render pattern).

---

### Phase 2: Core Schema & Seed `COMPLETED`

**Plan**: [docs/plans/phase-2-schema.md](./plans/phase-2-schema.md)
**Depende de**: Phase 1

- [x] 2.1 Complete Prisma schema (all models + enums)
- [x] 2.2 Migration
- [x] 2.3 Seed data (users, positions, manuals, evaluations)
- [x] 2.4 Zod schemas for domain models

**Notas**:
- 2026-06-15: Phase 2 completado. 6 modelos de dominio + 4 enums agregados. Migración complete-schema aplicada. Seed con 8 usuarios, 3 cargos, 2 manuales, 1 evaluación, 10 preguntas, 2 asignaciones, 10 respuestas. Zod schemas creados para position, manual, evaluation, assignment.

---

### Phase 3: Positions & Manuals `COMPLETED`

**Plan**: [docs/plans/phase-3-positions-manuals.md](./plans/phase-3-positions-manuals.md)
**Depende de**: Phase 2
**RAG**: Integrado — ingesta vía servicio RAG real (`POST /api/base_conocimiento/procesar`)

- [x] 3.1 RAG service client (src/lib/rag-client.ts)
- [x] 3.2 Position feature (queries, mutations, actions)
- [x] 3.3 Position pages (list, detail, form dialog)
- [x] 3.4 Manual feature (queries, mutations, actions)
- [x] 3.5 Manual pages (list, upload dialog, status badges)
- [x] 3.6 Integración con servicio RAG real (endpoints en `docs/DOCUMENTACION_API.md`)

**Notas**:
- 2026-06-15: Phase 3 completado. CRUD de cargos con tabla, formulario (TanStack Form) y vista detalle. Manuales con upload dialog, status badges, polling de estado. Cliente RAG integrado al servicio real del compañero (ver `docs/DOCUMENTACION_API.md`). Roles: solo ADMIN/HR pueden modificar. Select de departamentos y filtros funcionando.

---

### Phase 4: Evaluation Generation & HR Review `COMPLETED`

**Plan**: [docs/plans/phase-4-evaluations.md](./plans/phase-4-evaluations.md)
**Depende de**: Phase 3
**RAG**: Parcial — generacion necesita RAG o mock, review UI no depende

- [x] 4.1 RAG generation client extension
- [x] 4.2 Evaluation feature (queries, mutations)
- [x] 4.3 Evaluation actions (server)
- [x] 4.4 Generation page (select position, trigger RAG)
- [x] 4.5 Review page (question cards, ratings, approve/reject)
- [x] 4.6 Evaluations list page
- [x] 4.7 Zod schemas for evaluations

**Notas**:
- 2026-06-15: Phase 4 completado. Cliente RAG extendido con generateEvaluation (mock con 15 preguntas realistas). Server Actions: generate, updateQuestionText, updateQuestionStatus, rateQuestion, activateEvaluation, closeEvaluation. Generation page con slider 10-20 preguntas. Review page con QuestionReviewCard (editar, aprobar, rechazar, calificar IAP 1-5), ReviewSummaryBar con progreso y promedios. List page con filtro por estado.

---

### Phase 5: Assignment & Employee Response `COMPLETED`

**Plan**: [docs/plans/phase-5-assignments.md](./plans/phase-5-assignments.md)
**Depende de**: Phase 4
**RAG**: No

- [x] 5.1 Assignment feature (queries, mutations)
- [x] 5.2 Assignment actions (server)
- [x] 5.3 Assignment page — HR view (employee selector, table)
- [x] 5.4 Employee response page (Likert form, progress bar)
- [x] 5.5 Zod schemas for assignments

**Notas**:
- 2026-06-15: Phase 5 completado. Server Actions: assignEvaluation (con skip de duplicados), submitResponse (upsert + auto-save), completeAssignment (validación + score avg). HR page: EmployeeSelector con checkbox y search. Employee pages: Mis Evaluaciones (listado) + formulario Likert con auto-save individual, progress bar, y sticky bottom bar con confirmación.

---

### Phase 6: Results & Dashboard `COMPLETED`

**Plan**: [docs/plans/phase-6-results.md](./plans/phase-6-results.md)
**Depende de**: Phase 5
**RAG**: No

- [x] 6.1 Results feature (queries)
- [x] 6.2 Results actions (server — aggregations)
- [x] 6.3 Main dashboard page (stats, tables, role-based views)
- [x] 6.4 Evaluation results page (per-employee, per-question)
- [x] 6.5 Employee results detail (individual scores)
- [x] 6.6 Export placeholder button
- [x] 6.7 IAP & IRTO calculation utilities

**Notas**:
- 2026-06-15: Phase 6 completado. IAP (Indice de Adecuacion de Preguntas) e IRTO (Indice de Reduccion de Tiempo Operativo) con color coding. Dashboard con vistas por rol (HR/ADMIN: 4 stats + tabla; EMPLOYEE: 3 stats + evaluaciones). Resultados por evaluacion con stats cards, tabla de empleados, IAP/IRTO. Detalle por empleado con desglose pregunta por pregunta y comparacion contra promedio.

---

### Phase 7: Two Reviewer Calibration `COMPLETED`

**Depende de**: Phase 6
**RAG**: No — cambios solo en UPCA App (schema, logica, UI)

Esquema de validacion Human-in-the-Loop con dos revisores independientes (HR + AREA_LEAD) para las calificaciones IAP de cada pregunta.

- [x] 7.1 Schema diseñado y migrado (enum `ReviewerRole`, `CalibrationStatus`, modelos `QuestionReview`, `QuestionConsensus`, `Position.leaderId`, `Role.AREA_LEAD`)
- [x] 7.2 Server Actions implementadas (`submitReview`, `computeCalibration`, `resolveCalibration`, `activateEvaluation` actualizado)
- [x] 7.3 UI components actualizada (review page con dos revisores, calibration panel, AREA_LEAD scoped views)
- [x] 7.4 Tests passing

**Notas**:
- 2026-07-16: Two Reviewer Calibration implementado. Schema migrado: `QuestionReview` (1:1 unique per reviewerRole per question), `QuestionConsensus` (1:1 con Question), `Position.leaderId` para vincular AREA_LEAD. `Question.relevanceRating/coherenceRating/adequacyRating` removidos (ahora en `QuestionReview` y `QuestionConsensus`). Logica: `submitReview` → `computeCalibration` (auto-consenso si |Δ| < 2, `IN_CALIBRATION` si |Δ| ≥ 2) → `resolveCalibration` (manual). `activateEvaluation` requiere `QuestionStatus` editorial (APPROVED/EDITED) **Y** `CalibrationStatus = RESOLVED`. Resultados/IAP leen desde `QuestionConsensus`.

---

## Coordinacion con companero RAG

| Fase nuestra | Que necesitamos del RAG | Estado RAG |
|--------------|------------------------|------------|
| Phase 0-2 | Nada — datos en nuestra DB | N/A |
| Phase 3 | `POST /api/base_conocimiento/procesar`, `POST .../guardar` (ingesta de manuales) | INTEGRATED |
| Phase 4 | `POST /api/evaluacion/generar` (generación de evaluación Likert) | INTEGRATED |
| Phase 3 aux | `GET /api/cargos`, `GET /api/base_conocimiento/contenido`, `DELETE .../eliminar` (listado, contenido y borrado de base de conocimiento) | INTEGRATED |
| Phase 5-6 | Nada — datos ya en nuestra DB | N/A |

**Guia para el companero**: [docs/rag-teammate-guide.md](./rag-teammate-guide.md)
**Contrato API (REAL)**: [docs/DOCUMENTACION_API.md](./DOCUMENTACION_API.md) — endpoints del servicio RAG del compañero; cliente en `src/lib/rag-client.ts`.
**Contrato API (SUPERSEDED)**: [docs/rag-api-contract.md](./rag-api-contract.md) — diseño original, nunca implementado tal cual. Usar `DOCUMENTACION_API.md`.

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
- RAG service es HTTP separado (FastAPI/Python por el compañero). Integración real completada (ver `docs/DOCUMENTACION_API.md` y `src/lib/rag-client.ts`); el modo mock fue retirado.
- 2026-07-05: Feature de gestión de base de conocimientos RAG (`POST /api/base_conocimiento/procesar|guardar`, `GET .../contenido`, `DELETE .../eliminar`) añadida tras Phase 6, fuera de las fases originales. Refleja el contrato real del servicio del compañero.
- Deploy: Vercel + Neon Postgres. Se configura al final del proyecto.
- 2026-07-16: Feature de Two Reviewer Calibration añadido tras Phase 6 (fuera de las fases originales). Esquema Human-in-the-Loop con dos revisores (HR + AREA_LEAD) para calificaciones IAP. Ver Phase 7 arriba y `docs/erd.md` / `docs/architecture.md` actualizados.
