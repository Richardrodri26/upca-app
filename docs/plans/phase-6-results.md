# Phase 6: Results & Dashboard

## Objective
Implement the results dashboard with aggregated metrics, per-evaluation and per-employee breakdowns, IAP (Indice de Adecuacion de Preguntas) calculation, IRTO (Indice de Reduccion de Tiempo Operativo) display, and role-appropriate dashboard views.

## Prerequisites
- Phase 5 completed: assignments can be completed with full response sets and calculated scores
- Evaluations exist with `generationTime` populated (from Phase 4 RAG generation)
- Questions have IAP ratings (`relevanceRating`, `coherenceRating`, `adequacyRating`) populated by HR during Phase 4 review
- At least some completed assignments with responses exist (for meaningful data display)

## Steps

### Step 6.1: IAP & IRTO Utility Functions
**Files**: `src/features/results/utils/iap.ts`
**Action**: Create pure utility functions for thesis metric calculations.
**Details**:
- `calculateIAP(questions: { relevanceRating: number | null, coherenceRating: number | null, adequacyRating: number | null }[])`:
  - Filter to only questions that have all three ratings set (non-null)
  - For each rated question, compute `avg = (relevanceRating + coherenceRating + adequacyRating) / 3`
  - IAP = percentage of rated questions where `avg >= 4.0`
  - Return `{ iap: number (0-100), ratedCount: number, totalCount: number }`
  - If no questions are rated, return `{ iap: 0, ratedCount: 0, totalCount: questions.length }`
- `calculateIRTO(generationTimeSeconds: number, manualBaselineMinutes: number)`:
  - Convert generationTime to minutes: `generationMinutes = generationTimeSeconds / 60`
  - IRTO = `((manualBaselineMinutes - generationMinutes) / manualBaselineMinutes) * 100`
  - Clamp result between 0 and 100
  - Return `{ irto: number (0-100), generationMinutes: number, manualBaselineMinutes: number }`
  - Default `manualBaselineMinutes` = 120 (typical manual evaluation creation time, configurable)
- Export both functions and their return types
- Include JSDoc comments explaining each metric's thesis significance

### Step 6.2: Results Server Actions
**Files**: `src/features/results/actions.ts`
**Action**: Create read-only server actions for dashboard and results data.
**Details**:
- `getDashboardStats()`:
  - Validate caller role is HR or ADMIN
  - Query aggregated counts:
    - Active evaluations: `Evaluation WHERE status = "ACTIVE"` count
    - Processed manuals: `Manual WHERE status = "PROCESSED"` count
    - Evaluated employees: `EvaluationAssignment WHERE status = "COMPLETED"` distinct employeeId count
    - Average IAP: compute IAP across ALL questions that have ratings, return the overall percentage
  - Return all four stats
- `getEvaluationResults(evaluationId: string)`:
  - Validate caller role is HR or ADMIN
  - Fetch the evaluation with position name
  - Fetch all assignments with employee name, status, score, completedAt
  - Fetch all questions with their responses
  - Calculate overall average score across all completed assignments
  - Calculate per-question average scores
  - Calculate IAP for this evaluation's questions using `calculateIAP`
  - Calculate IRTO using `calculateIRTO` with the evaluation's `generationTime`
  - Return: evaluation info, assignment summaries, per-question averages, IAP, IRTO
- `getEmployeeResults(evaluationId: string, employeeId: string)`:
  - Validate caller role is HR, ADMIN, or the employee themselves (EMPLOYEE can view own results)
  - Fetch the assignment for this employee + evaluation
  - Fetch all responses for this assignment, joined with question text
  - Return: employee info, overall score, individual question responses
- `getDashboardStatsForEmployee()`:
  - Validate caller role is EMPLOYEE
  - Query: total assignments, completed count, average score across completed, pending count
  - Return stats relevant to the employee view
- All actions are read-only (no mutations). Use `"use server"` directive.

### Step 6.3: Results Queries (TanStack)
**Files**: `src/features/results/queries.ts`
**Action**: Create TanStack Query hooks for results data fetching.
**Details**:
- `useDashboardStats()` -- calls `getDashboardStats`, query key `["dashboard-stats"]`, staleTime 5 minutes (stats do not change frequently)
- `useEmployeeDashboardStats()` -- calls `getDashboardStatsForEmployee`, query key `["employee-dashboard-stats"]`
- `useEvaluationResults(evaluationId: string)` -- calls `getEvaluationResults`, query key `["evaluation-results", evaluationId]`
- `useEmployeeResults(evaluationId: string, employeeId: string)` -- calls `getEmployeeResults`, query key `["employee-results", evaluationId, employeeId]`
- Use `queryOptions` pattern for all queries

### Step 6.4: Main Dashboard Page
**Files**: `src/app/(dashboard)/page.tsx`
**Action**: Update the dashboard home page with role-appropriate views.
**Details**:
- **HR/ADMIN Dashboard**:
  - 4 stat cards in a responsive grid (2x2 on mobile, 4x1 on desktop):
    - "Evaluaciones Activas" -- count with clipboard icon
    - "Manuales Procesados" -- count with document icon
    - "Empleados Evaluados" -- count with users icon
    - "IAP Promedio" -- percentage with chart icon, color-coded (green >= 80%, yellow >= 60%, red < 60%)
  - "Evaluaciones Recientes" section: table showing the 5 most recent evaluations (title, position, status badge, creation date, action link)
  - "Actividad Reciente" section: feed of the latest 10 events (assignment created, evaluation completed, evaluation activated) with timestamps and descriptions
- **EMPLOYEE Dashboard**:
  - 3 stat cards: "Evaluaciones Pendientes" (count), "Evaluaciones Completadas" (count), "Puntaje Promedio" (average score across completed)
  - "Mis Evaluaciones" section: list of assigned evaluations with status and action buttons (same data as my-evaluations page, condensed view)
- Detect role from session and render the appropriate view
- Loading skeletons for all sections while data is being fetched

### Step 6.5: Evaluation Results Page
**Files**: `src/app/(dashboard)/evaluations/[id]/results/page.tsx`, `src/features/results/components/stats-cards.tsx`, `src/features/results/components/results-table.tsx`, `src/features/results/components/iap-indicator.tsx`
**Action**: Create the detailed results view for a single evaluation.
**Details**:
- **Summary section** (top):
  - StatsCards component with 4 cards: Puntaje Promedio (avg score across all completed assignments), Total Respuestas (completed assignments count), IAP (percentage with color), IRTO (percentage with color)
- **IAPIndicator**:
  - Circular or bar visual showing the IAP percentage
  - Color coding: green >= 80%, yellow >= 60%, red < 60%
  - Tooltip or subtitle: "X de Y preguntas con calificacion promedio >= 4.0"
- **ResultsTable**:
  - Columns: Empleado, Email, Estado (badge), Puntaje, Fecha Completado
  - Sortable by score and date
  - Click on employee row navigates to `/evaluations/[id]/results/[employeeId]`
  - Show average row at the bottom
- Breadcrumb: Evaluaciones > [Titulo] > Resultados
- Role guard: HR/ADMIN only

### Step 6.6: Employee Results Detail Page
**Files**: `src/app/(dashboard)/evaluations/[id]/results/[employeeId]/page.tsx`
**Action**: Create the individual employee results detail view.
**Details**:
- **Employee info card**: Name, email, position, overall score (large, prominent), completion date
- **Question-by-question breakdown**:
  - Table or card list: Question text, Employee's Response (1-5 with Likert label), Question Average (across all employees who answered)
  - Highlight responses that are significantly below average (> 1 point below) in a subtle warning color
- Breadcrumb: Evaluaciones > [Titulo] > Resultados > [Empleado]
- Role guard: HR/ADMIN can view any employee. EMPLOYEE can only view their own results (server-side check in the action).

### Step 6.7: Export Placeholder
**Files**: `src/app/(dashboard)/evaluations/[id]/results/page.tsx` (modification)
**Action**: Add an export button as a placeholder for future functionality.
**Details**:
- Add "Exportar Resultados" button in the results page header area (secondary/outline style, with download icon)
- On click: show a toast notification "Funcionalidad de exportacion disponible proximamente"
- The button is intentionally visible to demonstrate planned functionality for thesis reviewers
- In the future, this would generate a CSV or PDF with evaluation results

### Step 6.8: IRTO Display Integration
**Files**: `src/features/results/components/stats-cards.tsx` (modification)
**Action**: Ensure IRTO is calculated and displayed correctly alongside IAP.
**Details**:
- IRTO card in the evaluation results page shows:
  - IRTO percentage (large, color-coded same as IAP)
  - Subtitle: "Tiempo IA: X min vs Tiempo Manual: Y min"
  - `generationTime` comes from the Evaluation record (stored in seconds in Phase 4)
  - `manualBaselineMinutes` defaults to 120 minutes. For MVP, this is a constant. A future enhancement could allow HR to configure this value per evaluation.
- If `generationTime` is null or 0 (edge case), show "No disponible" instead of a misleading percentage

## Completion Criteria
- [ ] HR/ADMIN dashboard shows 4 aggregated stat cards (active evaluations, processed manuals, evaluated employees, average IAP)
- [ ] Employee dashboard shows 3 stat cards (pending, completed, average score) and their evaluation list
- [ ] Evaluation results page shows per-employee scores with sortable table
- [ ] IAP metric is correctly calculated: percentage of rated questions with avg(3 ratings) >= 4.0
- [ ] IAP is displayed with color coding (green >= 80%, yellow >= 60%, red < 60%)
- [ ] IRTO metric is calculated from generationTime and manual baseline, displayed with time comparison
- [ ] Individual employee results page shows per-question breakdown
- [ ] Employee can view their own results (but not other employees' results)
- [ ] Export button exists as a visible placeholder with toast notification
- [ ] Dashboard renders different views based on user role (HR/ADMIN vs EMPLOYEE)
- [ ] All results pages have proper loading skeletons
- [ ] All calculations handle edge cases (no responses, no ratings, zero division)

## RAG Integration Notes
- No direct RAG calls in this phase
- `generationTime` from Phase 4 (captured from the RAG service's `generationTimeMs` response) is used for IRTO calculation
- IAP is computed from the HR ratings captured during Phase 4 question review, not from any RAG output
- Questions are a flat list with no dimension/category grouping. The only "dimensions" in the system are the 3 IAP rating fields (relevanceRating, coherenceRating, adequacyRating) on Question, used for thesis metric calculation

## Notes
- For the MVP, all chart visualizations use Tailwind-styled horizontal bars. This keeps the bundle small and avoids adding a chart library dependency. If more sophisticated visualizations are needed later (radar charts, line charts for trends), recharts is the recommended addition -- it integrates well with React and has reasonable bundle size.
- The manual baseline time for IRTO (120 minutes) is a thesis-defined constant representing how long it typically takes to manually create an evaluation. This value should be documented in the thesis methodology chapter. Making it configurable is a nice-to-have but not required for MVP.
- The export placeholder is deliberate. Implementing CSV/PDF export is a post-MVP enhancement. Having the button visible demonstrates to thesis reviewers that the feature was considered in the design.
- Consider adding a "last updated" timestamp to the dashboard stats to make it clear the data is not real-time. With TanStack Query's staleTime set to 5 minutes, the data could be slightly behind.
- Edge case handling is critical in this phase: evaluations with zero completed assignments, questions with no ratings, employees with partial responses. Every calculation function must handle these gracefully with fallback values rather than throwing errors.
