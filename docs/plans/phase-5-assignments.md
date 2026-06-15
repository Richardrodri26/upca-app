# Phase 5: Assignment & Employee Response

## Objective
Implement the evaluation assignment flow (HR assigns active evaluations to employees) and the employee response experience (Likert-scale questionnaire with progress saving and finalization).

## Prerequisites
- Phase 4 completed: evaluations can be generated, reviewed, and activated (status = ACTIVE)
- Users with EMPLOYEE role exist in the system (seeded or created via admin)
- Prisma schema includes EvaluationAssignment and Response models with unique constraints: `(evaluationId, employeeId)` on assignments and `(questionId, assignmentId)` on responses
- Better Auth session and role checking functional

## Steps

### Step 5.1: Zod Validation Schemas
**Files**: `src/lib/validators/assignment.ts`
**Action**: Create Zod schemas for assignment and response inputs.
**Details**:
- `AssignEvaluationSchema`: `{ evaluationId: z.string().cuid2(), employeeIds: z.array(z.string().cuid2()).min(1, "Debe seleccionar al menos un empleado") }`
- `SubmitResponseSchema`: `{ questionId: z.string().cuid2(), value: z.number().int().min(1).max(5) }`
- `CompleteAssignmentSchema`: `{ assignmentId: z.string().cuid2() }`
- Export all schemas and their inferred types

### Step 5.2: Assignment Server Actions
**Files**: `src/features/assignments/actions.ts`
**Action**: Create server actions for assignment management and response submission.
**Details**:
- `assignEvaluation(evaluationId: string, employeeIds: string[])`:
  - Validate caller role is HR or ADMIN
  - Verify evaluation exists and has `status: "ACTIVE"`
  - Verify all employee IDs correspond to existing users with `role: "EMPLOYEE"`
  - Use `createMany` (or individual creates with error handling) to create `EvaluationAssignment` records with `status: "PENDING"`
  - Handle unique constraint violations gracefully -- if an employee is already assigned, skip that record and report which were skipped
  - Return count of created and skipped assignments
- `submitResponse(assignmentId: string, questionId: string, value: number)`:
  - Validate caller role is EMPLOYEE
  - Verify the assignment belongs to the calling user (`employeeId` matches session user ID)
  - Verify the assignment status is PENDING or IN_PROGRESS
  - Verify the question belongs to the same evaluation as the assignment
  - Upsert the Response record (using the unique constraint `(questionId, assignmentId)`) -- this allows employees to change their answer before finalizing
  - If assignment status is PENDING, update it to IN_PROGRESS
  - Return the saved response
- `completeAssignment(assignmentId: string)`:
  - Validate caller role is EMPLOYEE
  - Verify the assignment belongs to the calling user
  - Count total questions in the evaluation and total responses for this assignment
  - Reject if not all questions have been answered
  - Calculate average score: `AVG(response.value)` across all responses for this assignment
  - Update the assignment: `status: "COMPLETED"`, `score: calculatedAvg`, `completedAt: new Date()`
  - Return the final score
- All actions must use `"use server"` directive and revalidate relevant paths

### Step 5.3: Assignment Queries & Mutations (TanStack)
**Files**: `src/features/assignments/queries.ts`, `src/features/assignments/mutations.ts`
**Action**: Create TanStack Query hooks for assignment data and operations.
**Details**:
- Queries (`queries.ts`):
  - `useEvaluationAssignments(evaluationId: string)` -- list all assignments for an evaluation, includes employee name/email, status, score, completedAt. For HR view.
  - `useMyAssignments()` -- current employee's assignments across all evaluations. Includes evaluation title, position name, status, score. For employee dashboard.
  - `useAssignment(assignmentId: string)` -- single assignment with full detail: evaluation info, all questions, and any existing responses for this assignment. For the response form.
- Mutations (`mutations.ts`):
  - `useAssignEvaluation` -- wraps `assignEvaluation` action, invalidates `["assignments", evaluationId]`
  - `useSubmitResponse` -- wraps `submitResponse` action, invalidates `["assignments", assignmentId]`. Consider optimistic update: immediately show the selected value in the UI.
  - `useCompleteAssignment` -- wraps `completeAssignment` action, invalidates `["assignments"]` and `["my-assignments"]`
- Query keys: `["assignments", evaluationId]`, `["my-assignments"]`, `["assignments", assignmentId]`

### Step 5.4: Assignment Page (HR View)
**Files**: `src/app/(dashboard)/evaluations/[id]/assignments/page.tsx`, `src/features/assignments/components/employee-selector.tsx`, `src/features/assignments/components/assignments-table.tsx`, `src/features/assignments/components/assignment-status-badge.tsx`
**Action**: Create the page where HR assigns an active evaluation to employees.
**Details**:
- **Page layout**:
  - Top section: Evaluation details card (title, position, question count, status badge)
  - Middle section: Employee selector for new assignments
  - Bottom section: Table of existing assignments
- **EmployeeSelector**:
  - Fetch users with `role: "EMPLOYEE"`
  - Search input to filter by name or email
  - Optional filter by department (from Position association if available)
  - Checkbox list of employees
  - Already-assigned employees shown as disabled with "Ya asignado" label
  - "Asignar Evaluacion" button with confirmation dialog: "Se asignara esta evaluacion a X empleados. Confirmar?"
  - Show result toast: "X empleados asignados, Y ya tenian asignacion"
- **AssignmentsTable**:
  - Columns: Empleado (name), Email, Estado (badge), Puntaje (if completed, formatted to 1 decimal), Fecha Asignacion, Fecha Completado
  - Sort by status (pending first) then by date
  - Empty state: "No hay asignaciones para esta evaluacion"
- **AssignmentStatusBadge**: Maps AssignmentStatus to Spanish label and color: Pendiente (gray), En Progreso (yellow), Completada (green)
- Breadcrumb: Evaluaciones > [Titulo] > Asignaciones
- Role guard: redirect non-HR/ADMIN users

### Step 5.5: Employee Evaluations List Page
**Files**: `src/app/(dashboard)/my-evaluations/page.tsx`
**Action**: Create the employee's list of assigned evaluations.
**Details**:
- Page title: "Mis Evaluaciones"
- Card or table layout showing assigned evaluations:
  - Evaluation title
  - Position name
  - Status badge (Pendiente, En Progreso, Completada)
  - Score (if completed, displayed prominently)
  - Assignment date
  - Action: "Responder" button (if PENDING or IN_PROGRESS) or "Ver Resultado" (if COMPLETED)
- Sort: incomplete evaluations first, then completed by date descending
- Empty state: "No tienes evaluaciones asignadas"
- Role guard: only EMPLOYEE role can access

### Step 5.6: Employee Response Page
**Files**: `src/app/(dashboard)/my-evaluations/[assignmentId]/page.tsx`, `src/features/assignments/components/likert-question.tsx`, `src/features/assignments/components/evaluation-progress-bar.tsx`, `src/features/assignments/components/response-form.tsx`
**Action**: Create the Likert-scale questionnaire interface for employees.
**Details**:
- **Page layout**: Clean, focused, minimal distractions. Single-column centered layout.
  - Top: Evaluation title, position name, brief instructions ("Responda cada pregunta seleccionando la opcion que mejor describe el desempeno del empleado")
  - Progress bar below header
  - Questions listed vertically
  - Sticky bottom bar with action buttons
- **EvaluationProgressBar**:
  - Shows "X de Y respondidas" with a filled bar
  - Color transitions: red (< 33%), yellow (33-66%), green (> 66%)
- **LikertQuestion**:
  - Question number (bold) + question text
  - Row of 5 radio-style options, each labeled:
    - 1 = Nunca
    - 2 = Raramente
    - 3 = A veces
    - 4 = Frecuentemente
    - 5 = Siempre
  - Selected option visually highlighted (filled circle, color accent)
  - Pre-populated with existing response value if the employee has already answered (for resume functionality)
- **ResponseForm**:
  - Wraps all LikertQuestion components
  - Each question change triggers `useSubmitResponse` mutation (auto-save individual responses)
  - Debounce or immediate save -- immediate is preferred since each response is a single integer
- **Sticky bottom bar**:
  - "Guardar y Salir" button (secondary) -- navigates back to my-evaluations, progress is already saved via auto-save
  - "Finalizar Evaluacion" button (primary) -- enabled only when all questions are answered. Shows confirmation dialog: "Una vez finalizada, no podra modificar sus respuestas. Confirmar?"
  - On finalization success: show score and redirect to my-evaluations
- If assignment status is COMPLETED: show read-only view of all responses with the final score, hide action buttons

## Completion Criteria
- [ ] HR can assign an active evaluation to one or multiple employees simultaneously
- [ ] Duplicate assignments are prevented (unique constraint on evaluationId + employeeId)
- [ ] Already-assigned employees are visually indicated in the selector
- [ ] Employees see their pending and completed evaluations in "Mis Evaluaciones"
- [ ] Employee can respond to each question with a Likert value 1-5
- [ ] Individual responses are saved immediately (auto-save on selection)
- [ ] Employee can leave and return to an in-progress evaluation with responses preserved
- [ ] Assignment status transitions correctly: PENDING -> IN_PROGRESS (on first response) -> COMPLETED (on finalization)
- [ ] Employee can only finalize when ALL questions have been answered
- [ ] Average score is calculated and stored on completion
- [ ] Duplicate responses are prevented (unique constraint on questionId + assignmentId); existing responses are updated via upsert
- [ ] Completed evaluations show in read-only mode with final score
- [ ] Role protection: HR/ADMIN manage assignments, EMPLOYEE responds to their own evaluations only
- [ ] Employee cannot submit responses to another employee's assignment (server-side ownership check)

## RAG Integration Notes
No direct RAG interaction in this phase. This phase consumes the questions generated in Phase 4.

## Notes
- The auto-save approach (saving each response individually on selection) provides the best UX for a potentially long questionnaire. It eliminates the risk of data loss if the employee closes the browser.
- The upsert pattern for responses allows employees to change their answer before finalizing. After finalization (COMPLETED status), no further changes are allowed.
- The Likert scale labels (Nunca through Siempre) are standard for behavioral frequency assessment and align with the thesis methodology. Do NOT change these labels without consulting the thesis requirements.
- Consider adding a confirmation step before assignment if the employee count is large (> 20), to prevent accidental mass-assignment.
- The `score` field on EvaluationAssignment stores the simple average of all response values (1-5 scale).
