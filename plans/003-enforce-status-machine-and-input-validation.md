# Plan 003: Enforce the evaluation status machine and validate Likert/assignment inputs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/features/assignments src/lib/validators`
> Written against the working tree at `6674b8e`. If the excerpts below don't
> match the live code, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (001 recommended first; no file conflicts except `src/features/assignments/actions.ts` — coordinate if run concurrently)
- **Category**: bug
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

Three integrity holes in the assignment flow:

1. **Closed evaluations are still mutable.** `submitResponse` and
   `completeAssignment` check the *assignment* status but never the
   *evaluation* status. After HR closes an evaluation (DRAFT → REVIEW →
   ACTIVE → CLOSED), evaluators can still change answers and finalize scores,
   silently mutating results that were already reported.
2. **Likert values are unvalidated.** `submitResponse` accepts any
   `value: number` and upserts it. A direct call to the action (Server Actions
   are public POST endpoints) can store `999` or `-3`, which flows into
   `completeAssignment`'s average and the dashboard. The Zod schema for this
   **already exists** in `src/lib/validators/assignment.ts` — it's just never
   used by the action.
3. **Self-evaluation is possible.** `assignEvaluation` accepts
   `employeeId === evaluatorId` pairs, violating the domain rule that the
   evaluator is the employee's manager ("evaluador = jefe directo").

Also fixed here (same functions): `completeAssignment` is a non-atomic
check-then-act, and its "all questions answered" guard doesn't protect against
a zero-question division (`0 < 0` is false → `0/0 = NaN`).

## Current state

- `src/features/assignments/actions.ts:144-198` — `submitResponse`. It checks
  ownership and `assignment.status === "COMPLETED"`, but its select does not
  include the evaluation status, and `value` goes straight to the upsert:

  ```ts
  export async function submitResponse(
    assignmentId: string,
    questionId: string,
    value: number,
  ) {
    const session = await requireAuth();
    const assignment = await prisma.evaluationAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, evaluatorId: true, status: true, evaluationId: true },
    });
    // ...ownership + COMPLETED checks...
    await prisma.response.upsert({
      where: { questionId_assignmentId: { questionId, assignmentId } },
      create: { questionId, assignmentId, value },
      update: { value },
    });
  ```

- `src/features/assignments/actions.ts:204-253` — `completeAssignment`:

  ```ts
  if (totalResponses < totalQuestions) {           // :232 — passes when both are 0
    return { success: false, error: `Faltan ...` };
  }
  const score =
    assignment.responses.reduce((sum, r) => sum + r.value, 0) / totalResponses; // :239-240
  await prisma.evaluationAssignment.update({        // :242 — separate write, race with itself
  ```

- `src/features/assignments/actions.ts:12-57` — `assignEvaluation` loops
  `pairs: { employeeId: string; evaluatorId: string }[]` into individual
  creates with no pair validation. (The per-row loop itself is replaced by
  plan 007 — do NOT restructure the loop here, only add validation.)

- `src/lib/validators/assignment.ts:20-28` — the unused schema, ready to wire:

  ```ts
  export const submitResponseSchema = z.object({
    assignmentId: z.string().min(1, { error: "El ID de la asignación es requerido" }),
    questionId: z.string().min(1, { error: "El ID de la pregunta es requerido" }),
    value: z.number().int({ error: "Debe ser un número entero" })
      .min(1, { error: "Mínimo 1" }).max(5, { error: "Máximo 5" }),
  });
  ```

  Note: `assignEvaluationSchema` in the same file (lines 7-12) still has the
  PRE-evaluator-model shape (`employeeIds: string[]`) — it drifted when commit
  `eb94439` introduced employee/evaluator pairs. This plan replaces it.

- `src/features/assignments/components/employee-selector.tsx:71-78` — client
  `handleAdd` accepts any employee/evaluator combination; the evaluator select
  at :105-110 is fed the full `users` list.

- Evaluation status enum: `DRAFT | REVIEW | ACTIVE | CLOSED`. Assignments are
  only created for ACTIVE evaluations (`assignEvaluation` checks this at :26).

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Dev       | `pnpm dev` | starts on :3000 |

(Repo-wide `pnpm lint` is currently broken — plan 005. Scope any biome check
to the files you touch.)

## Scope

**In scope**:
- `src/features/assignments/actions.ts` (`submitResponse`,
  `completeAssignment`, `assignEvaluation` — validation only)
- `src/lib/validators/assignment.ts` (replace the stale
  `assignEvaluationSchema`)
- `src/features/assignments/components/employee-selector.tsx` (client-side
  self-evaluation guard)

**Out of scope**:
- `rateQuestion` validation — plan 002 owns it.
- Replacing the `assignEvaluation` create-loop with `createMany` — plan 007.
- `closeEvaluation` cascade behavior (marking outstanding assignments) — a
  product decision; see Maintenance notes.
- The results/IAP code.

## Git workflow

- Branch: `advisor/003-status-and-validation`
- Suggested commit: `fix(assignments): enforce ACTIVE-evaluation guard, validate inputs, block self-evaluation`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Wire `submitResponseSchema` and the ACTIVE-evaluation guard into `submitResponse`

At the top of `submitResponse`, after `requireAuth()`:

```ts
const parsed = submitResponseSchema.safeParse({ assignmentId, questionId, value });
if (!parsed.success) {
  return { success: false, error: "Valor inválido: debe ser un entero entre 1 y 5" };
}
```

Extend the assignment select to include the evaluation status and reject
non-ACTIVE:

```ts
const assignment = await prisma.evaluationAssignment.findUnique({
  where: { id: assignmentId },
  select: {
    id: true, evaluatorId: true, status: true, evaluationId: true,
    evaluation: { select: { status: true } },
  },
});
// after the existing COMPLETED check:
if (assignment.evaluation.status !== "ACTIVE") {
  return { success: false, error: "La evaluación ya no está activa" };
}
```

Import `submitResponseSchema` from `@/lib/validators/assignment`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Same guard + safe completion in `completeAssignment`

Add `evaluation: { select: { status: true } }` availability — the existing
`include` already pulls `evaluation` with `_count`; add `status` via
`include: { evaluation: { include: { _count: ... } } }` → `assignment.evaluation.status`
is already available (the include returns all scalar fields). Add after the
COMPLETED check:

```ts
if (assignment.evaluation.status !== "ACTIVE") {
  return { success: false, error: "La evaluación ya no está activa" };
}
if (totalQuestions === 0) {
  return { success: false, error: "La evaluación no tiene preguntas" };
}
```

Then make the final write conditional to close the double-complete race —
replace the `update` with:

```ts
const updated = await prisma.evaluationAssignment.updateMany({
  where: { id: assignmentId, status: { not: "COMPLETED" } },
  data: {
    status: "COMPLETED",
    score: Math.round(score * 10) / 10,
    completedAt: new Date(),
  },
});
if (updated.count === 0) {
  return { success: false, error: "La evaluación ya fue completada" };
}
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Validate pairs and block self-evaluation in `assignEvaluation`

Replace the stale `assignEvaluationSchema` in
`src/lib/validators/assignment.ts` with the current shape:

```ts
export const assignEvaluationSchema = z.object({
  evaluationId: z.string().min(1, { error: "El ID de la evaluación es requerido" }),
  pairs: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        evaluatorId: z.string().min(1),
      }).refine((p) => p.employeeId !== p.evaluatorId, {
        error: "Un empleado no puede evaluarse a sí mismo",
      }),
    )
    .min(1, { error: "Debe agregar al menos un par empleado/evaluador" }),
});
```

First run `grep -rn "assignEvaluationSchema" src` — if the old schema has
live consumers, update them to the new shape (expected: none or only the
action; if a form component depends on the OLD `employeeIds` shape, STOP and
report).

In `assignEvaluation`, parse `{ evaluationId, pairs }` with `safeParse` before
the existing evaluation-status check and return the flattened error message on
failure.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Client-side guard in the selector (UX only)

In `employee-selector.tsx`, prevent adding a self-pair in `handleAdd`:

```ts
const handleAdd = () => {
  const employee = users.find((u) => u.id === employeeId);
  const evaluator = users.find((u) => u.id === evaluatorId);
  if (!employee || !evaluator) return;
  if (employee.id === evaluator.id) return; // self-evaluation blocked server-side too
  ...
```

and filter the evaluator options: pass
`users.filter((u) => u.id !== employeeId)` to the "Evaluador (jefe directo)"
`UserSelect` (:105-110).

**Verify**: `npx tsc --noEmit` → exit 0; in `pnpm dev`, selecting an employee
removes them from the evaluator dropdown.

### Step 5: Manual smoke test

1. As HR: assign an ACTIVE evaluation to a pair → works. Try to add a
   self-pair → UI prevents it.
2. As the evaluator: answer questions, complete → works as before.
3. As HR: close the evaluation. As the evaluator: the response form for that
   evaluation now rejects changes ("La evaluación ya no está activa").

**Verify**: all three pass; #3 is the regression this plan fixes.

## Test plan

Deferred to plan 005 infrastructure. When available, cover: submitResponse
rejects value 0/6/1.5 and non-ACTIVE evaluations; completeAssignment rejects
double completion and zero-question evaluations; assignEvaluation rejects
self-pairs.

## Done criteria

- [ ] `submitResponse` parses input with `submitResponseSchema` and rejects non-ACTIVE evaluations
- [ ] `completeAssignment` rejects non-ACTIVE, zero-question, and repeated completion (via `updateMany` guard)
- [ ] `assignEvaluationSchema` matches the pairs shape and rejects `employeeId === evaluatorId`
- [ ] Evaluator dropdown excludes the selected employee
- [ ] `npx tsc --noEmit` exits 0
- [ ] Manual smoke test passes
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- A live consumer depends on the OLD `assignEvaluationSchema` (`employeeIds`)
  shape in a way that isn't a mechanical update.
- The `completeAssignment` include shape doesn't expose `evaluation.status`
  as described.
- Any excerpt doesn't match the live code.

## Maintenance notes

- Product decision deferred: should `closeEvaluation` cascade to outstanding
  PENDING/IN_PROGRESS assignments (mark them EXPIRED/CANCELLED)? Today they
  just become dead rows that can no longer be completed. Surface this to the
  team.
- If reopening evaluations is ever added, the ACTIVE guard here is the single
  gate to revisit.
- Reviewer: check the Likert form's auto-save UX still shows a sane error when
  the evaluation closes mid-session.
