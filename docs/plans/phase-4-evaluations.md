# Phase 4: Evaluation Generation & HR Review

## Objective
Implement AI-powered evaluation generation via the RAG service (with mock fallback) and the complete HR review flow where questions can be approved, edited, or rejected with IAP ratings on three dimensions.

## Prerequisites
- Phase 2 (Prisma schema with all models, enums, and migrations) completed
- Phase 3 (positions CRUD and manual upload/ingestion) completed
- RAG contract defined in `docs/rag-api-contract.md`
- `src/lib/rag-client.ts` exists with at least the ingest function
- Better Auth configured with role-based access (HR, ADMIN, EMPLOYEE)

## Steps

### Step 4.1: RAG Generation Client Extension
**Files**: `src/lib/rag-client.ts`
**Action**: Add the `generateEvaluation` function to the existing RAG client.
**Details**:
- Add function `generateEvaluation(externalRef: string, positionName: string, questionCount: number)` that calls `POST /api/evaluations/generate` on the RAG service
- Validate the response with `GenerateEvaluationSuccessResponseSchema` from `docs/rag-api-contract.md`
- When `MOCK_RAG=true`, return a mock response with 10-15 fake questions:
  - Realistic Spanish question text (e.g., "El empleado demuestra conocimiento tecnico adecuado para las funciones del cargo")
  - `generationTimeMs` between 8000-15000 (random)
- Handle error responses and throw descriptive errors

### Step 4.2: Zod Validation Schemas
**Files**: `src/lib/validators/evaluation.ts`
**Action**: Create Zod schemas for all evaluation-related inputs.
**Details**:
- `GenerateEvaluationSchema`: `{ positionId: z.string().cuid2() }`
- `UpdateQuestionStatusSchema`: `{ status: z.enum(["APPROVED", "REJECTED"]) }`
- `UpdateQuestionTextSchema`: `{ text: z.string().min(10).max(500) }`
- `RateQuestionSchema`: `{ relevanceRating: z.number().int().min(1).max(5), coherenceRating: z.number().int().min(1).max(5), adequacyRating: z.number().int().min(1).max(5) }`
- `ActivateEvaluationSchema`: `{ evaluationId: z.string().cuid2() }`
- Export all schemas and their inferred types

### Step 4.3: Evaluation Server Actions
**Files**: `src/features/evaluations/actions.ts`
**Action**: Create server actions for the complete evaluation lifecycle.
**Details**:
- `generateEvaluation(positionId: string)`:
  - Validate caller role is HR or ADMIN via `auth.api.getSession({ headers })`
  - Look up the Position and its associated Manual; reject if manual status is not PROCESSED
  - Retrieve `externalRef` from the Manual record
  - Call `ragClient.generateEvaluation(externalRef, position.name, questionCount)`
  - Create an `Evaluation` record with `status: "REVIEW"`, `generationTime: generationTimeMs / 1000` (store in seconds), linked to Position and Manual
  - Create `Question` records for each returned question with `text` from RAG response, `status: "PENDING"`, `order` from array index
  - Return the created evaluation ID
- `updateQuestion(questionId: string, data)`:
  - Validate caller role is HR or ADMIN
  - If `data.text` is provided and differs from current text: save current text to `originalText`, update `text`, set `status: "EDITED"`
  - If `data.status` is provided: update status directly (for APPROVED/REJECTED)
  - If `data.ratings` is provided: update `relevanceRating`, `coherenceRating`, `adequacyRating`
- `activateEvaluation(evaluationId: string)`:
  - Validate caller role is HR or ADMIN
  - Query all questions for this evaluation
  - Reject if ANY question has `status: "PENDING"` -- all must be reviewed
  - Reject if ANY question has `status: "REJECTED"` and has not been replaced or removed
  - Change evaluation `status` to `"ACTIVE"`
- `closeEvaluation(evaluationId: string)`:
  - Validate caller role is HR or ADMIN
  - Change evaluation `status` to `"CLOSED"`
- All actions must use `"use server"` directive and revalidate relevant paths

### Step 4.4: Evaluation Queries & Mutations (TanStack)
**Files**: `src/features/evaluations/queries.ts`, `src/features/evaluations/mutations.ts`
**Action**: Create TanStack Query hooks for data fetching and mutations.
**Details**:
- Queries (`queries.ts`):
  - `useEvaluations(filters?: { status?: EvaluationStatus })` -- list evaluations with optional status filter, includes position name and question count
  - `useEvaluation(id: string)` -- single evaluation with its questions
  - `useEvaluationQuestions(evaluationId: string)` -- questions for the review page
- Mutations (`mutations.ts`):
  - `useGenerateEvaluation` -- wraps the `generateEvaluation` server action, invalidates evaluations list on success
  - `useUpdateQuestionStatus` -- wraps question status update, invalidates evaluation questions
  - `useUpdateQuestionText` -- wraps question text update, invalidates evaluation questions
  - `useRateQuestion` -- wraps rating update, invalidates evaluation questions
  - `useActivateEvaluation` -- wraps activation, invalidates evaluations list
- Use `queryOptions` pattern for queries to enable prefetching
- Query keys: `["evaluations"]`, `["evaluations", id]`, `["evaluations", evaluationId, "questions"]`

### Step 4.5: Generation Page
**Files**: `src/app/(dashboard)/evaluations/generate/page.tsx`
**Action**: Create the evaluation generation page where HR selects a position and triggers AI generation.
**Details**:
- Page title: "Generar Evaluacion"
- Position selector dropdown -- only show positions that have a Manual with `status: "PROCESSED"`
- Question count input with slider or number input (range 10-20, default 15)
- "Generar con IA" primary button
- Loading state: disable the form, show a spinner with elapsed time counter (updates every second)
- On success: redirect to `/evaluations/[newId]/review`
- On error: show toast with error message
- Breadcrumb: Evaluaciones > Generar
- Role guard: redirect non-HR/ADMIN users

### Step 4.6: Review Page
**Files**: `src/app/(dashboard)/evaluations/[id]/review/page.tsx`, `src/features/evaluations/components/question-review-card.tsx`, `src/features/evaluations/components/rating-slider.tsx`, `src/features/evaluations/components/review-summary-bar.tsx`, `src/features/evaluations/components/evaluation-status-badge.tsx`
**Action**: Create the question review interface for HR to evaluate AI-generated questions.
**Details**:
- **ReviewSummaryBar** (top of page, sticky):
  - Progress: "X de Y revisadas" with a progress indicator
  - Average ratings across all rated questions
  - "Activar Evaluacion" button -- enabled only when all questions are APPROVED or EDITED (no PENDING, no REJECTED)
  - Evaluation title and position name
- **QuestionReviewCard** (repeated for each question):
  - Question number and text displayed prominently
  - Status badge: Pendiente (gray), Aprobada (green), Editada (blue), Rechazada (red)
  - Inline text editing: pencil icon toggles edit mode, showing a textarea with save/cancel
  - Three rating sliders (1-5 each): Pertinencia, Coherencia, Adecuacion
  - Approve button (check icon) and Reject button (X icon)
  - If question was edited: collapsible section showing "Texto original (IA):" with the `originalText` value
- **RatingSlider**: A row of 5 clickable/selectable numbers (1-5) with labels, visually indicates current selection
- **EvaluationStatusBadge**: Reusable badge component mapping EvaluationStatus enum to color and Spanish label
- Page fetches evaluation and questions data; shows loading skeleton while fetching
- Role guard: redirect non-HR/ADMIN users

### Step 4.7: Evaluations List Page
**Files**: `src/app/(dashboard)/evaluations/page.tsx`
**Action**: Create the evaluations listing page.
**Details**:
- Page title: "Evaluaciones"
- "Generar Nueva" button linking to `/evaluations/generate`
- Filter tabs or dropdown by status: Todas, En Revision, Activas, Cerradas
- Table columns: Titulo, Cargo, Estado (badge), Preguntas (count), Fecha de Creacion, Acciones
- Actions column:
  - If REVIEW: "Revisar" link to `/evaluations/[id]/review`
  - If ACTIVE: "Ver Asignaciones" link to `/evaluations/[id]/assignments`
  - If ACTIVE or CLOSED: "Ver Resultados" link to `/evaluations/[id]/results`
- Empty state when no evaluations exist: illustration/icon + "No hay evaluaciones" message + CTA to generate
- Role guard: redirect non-HR/ADMIN users

## Completion Criteria
- [ ] HR can select a position (with processed manual) and generate an evaluation via RAG or mock
- [ ] Generated questions appear in the review page with PENDING status
- [ ] HR can approve individual questions (status changes to APPROVED)
- [ ] HR can reject individual questions (status changes to REJECTED)
- [ ] HR can edit question text inline (originalText is preserved, status changes to EDITED)
- [ ] HR can rate each question on 3 dimensions (relevanceRating, coherenceRating, adequacyRating) with values 1-5
- [ ] Edited questions display the original AI-generated text in a collapsible section
- [ ] Evaluation can be activated only when ALL questions are either APPROVED or EDITED
- [ ] Generation time (in seconds) is captured from the RAG response and stored in the Evaluation record
- [ ] Evaluations list page shows all evaluations with status filtering
- [ ] Role protection: only HR and ADMIN can access generation, review, and list pages
- [ ] Mock RAG mode returns realistic Spanish questions

## RAG Integration Notes
- Mock mode (`MOCK_RAG=true`) returns realistic Spanish evaluation questions
- When the real RAG service is connected, only the implementation inside `rag-client.ts` changes -- all server actions, queries, mutations, and UI remain identical
- `generationTimeMs` from the RAG response is converted to seconds before storing in the `Evaluation.generationTime` field

## Notes
- The `Question.status` workflow is: PENDING -> APPROVED, PENDING -> REJECTED, PENDING -> EDITED (via text change). There is no transition from APPROVED back to PENDING.
- Consider adding optimistic updates in TanStack mutations for the review flow to make the UI feel responsive when approving/rejecting questions rapidly.
