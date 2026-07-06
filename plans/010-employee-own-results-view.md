# Plan 010: Give the evaluated employee a way to see their own results

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/features/results src/features/assignments "src/app/(dashboard)"`
> On mismatch with the excerpts below, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (auth guards must land first — this plan adds a new
  read action and it must be born guarded)
- **Category**: direction
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

The core loop of a performance-evaluation system includes "let me see how I
was rated" — and this app computes it, authorizes it, and renders it... but no
evaluated employee can reach it. `getEmployeeResults`
(`src/features/results/actions.ts:157-171`) explicitly allows an EMPLOYEE to
read their own breakdown, and the page exists at
`/evaluations/[id]/results/[employeeId]`. But all employee-facing navigation
(`/my-evaluations`, dashboard) is filtered by `evaluatorId` — evaluations the
user CONDUCTS, not evaluations ABOUT them. The server capability is
unreachable UI. Closing this asymmetry completes the employee story and demos
well at the thesis defense.

**Product decision embedded in this plan** (confirm with operator if in
doubt): the employee sees their own score, per-question responses, AND the
cross-employee per-question average — because `getEmployeeResults` already
returns `overallAverage` per question to them today (`:229-235`). This plan
does NOT change that visibility; it only adds navigation. If the operator
wants averages hidden from employees, that is a one-field change in
`getEmployeeResults` — flag it, don't decide it.

## Current state

- Authorization already correct, in `src/features/results/actions.ts:157-171`:

  ```ts
  export async function getEmployeeResults(evaluationId: string, employeeId: string) {
    const session = await getSession();
    if (!session) return { error: "No autorizado" };
    // EMPLOYEE can only view their own results
    if (session.user.role === "EMPLOYEE" && session.user.id !== employeeId) {
      return { error: "No autorizado" };
    }
  ```

- The detail page: `src/app/(dashboard)/evaluations/[id]/results/[employeeId]/page.tsx`
  (a `"use client"` page using `useEmployeeResults(evaluationId, employeeId)`
  from `src/features/results/queries.ts:33-39`).

- Employee-facing surfaces today:
  - `/my-evaluations` (`src/app/(dashboard)/my-evaluations/page.tsx`) — driven
    by `getMyAssignments`, which filters `evaluatorId: session.user.id`
    (`src/features/assignments/actions.ts:84-99`) — the EVALUATOR surface, by
    design (`AGENTS.md` domain rule 6).
  - Dashboard EMPLOYEE view (`src/app/(dashboard)/page.tsx:167-277`) — stats
    from `getDashboardStatsForEmployee` (which DOES count by `employeeId` —
    note the asymmetry with the list below it, which uses `getMyAssignments`).

- Sidebar: `src/components/dashboard/app-sidebar.tsx` — nav items with
  role-conditional rendering (read it for the exact pattern before adding a
  link).

- Action-file conventions: reads guarded with `requireAuth` (post plan 001),
  queries in `features/{name}/queries.ts` as `useQuery` hooks with array keys.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Dev | `pnpm dev` | starts on :3000 |

## Scope

**In scope**:
- `src/features/results/actions.ts` (add ONE new read action, `getMyResults`)
- `src/features/results/queries.ts` (its hook)
- `src/app/(dashboard)/my-results/page.tsx` (create)
- `src/components/dashboard/app-sidebar.tsx` (one nav item)

**Out of scope**:
- Changing what `getEmployeeResults` exposes (the averages-visibility policy —
  flagged above, operator's call).
- The evaluator flow (`/my-evaluations`) — untouched.
- Emailing/notifying employees when results are ready — future.

## Git workflow

- Branch: `advisor/010-my-results`
- Suggested commit: `feat(results): employee-facing "Mis Resultados" page and navigation`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: `getMyResults` action

In `src/features/results/actions.ts`:

```ts
export async function getMyResults() {
  const session = await requireAuth();

  const assignments = await prisma.evaluationAssignment.findMany({
    where: { employeeId: session.user.id, status: "COMPLETED" },
    include: {
      evaluation: {
        select: { id: true, title: true, status: true,
                  position: { select: { name: true } } },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  return assignments;
}
```

Decision point encoded here: only COMPLETED assignments appear (an employee
shouldn't browse in-progress evaluations about them). Optionally also filter
`evaluation: { status: "CLOSED" }` if HR should control release timing — DO
NOT invent that policy; default to COMPLETED-only and note the alternative in
your report.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Hook

In `src/features/results/queries.ts`, matching the existing style:

```ts
export function useMyResults() {
  return useQuery({ queryKey: ["my-results"], queryFn: () => getMyResults() });
}
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Page

`src/app/(dashboard)/my-results/page.tsx` — `"use client"` (matching the
sibling pages), listing each completed assignment as a Card: evaluation
title, position name, score (`tabular-nums`, one decimal), completedAt date,
and a link "Ver detalle" →
`/evaluations/${a.evaluation.id}/results/${session.user.id}` (the EXISTING
detail page — get the user id from `useSession()`; see
`src/features/auth/hooks/use-session.ts`). Empty state: "Todavía no tenés
resultados de evaluaciones completadas." Match the Card/Table idioms of
`src/app/(dashboard)/my-evaluations/page.tsx` — open it first and mirror its
structure and Spanish tone.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Sidebar entry

In `app-sidebar.tsx`, add "Mis Resultados" (icon suggestion: an appropriate
lucide icon consistent with neighbors) visible to ALL roles or EMPLOYEE-only —
match how "Mis Evaluaciones" is currently gated (read the file; follow the
same conditional pattern), route `/my-results`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: Manual smoke test

1. Seed/prepare: an EMPLOYEE user with at least one COMPLETED assignment
   about them (and, ideally, one assignment where they are the evaluator, to
   check the two surfaces stay distinct).
2. As that employee: sidebar shows "Mis Resultados"; the page lists the
   completed evaluation with score; "Ver detalle" opens the per-question
   breakdown (their responses + averages).
3. As the employee, tamper the detail URL with ANOTHER employee's id → "No
   autorizado" (existing guard — regression check).
4. As HR: their results surfaces unchanged.

**Verify**: all pass.

## Test plan

No new pure logic (list + navigation). If plan 005's infra exists, no unit
test required; the auth behavior of `getEmployeeResults` (step 5.3) is the
future integration-test candidate already noted in plan 005.

## Done criteria

- [ ] `/my-results` renders the logged-in employee's COMPLETED assignments with scores
- [ ] Detail link lands on the existing breakdown page, authorized
- [ ] Sidebar shows the entry per the chosen role gating
- [ ] URL tampering to another employee's results still returns "No autorizado"
- [ ] `npx tsc --noEmit` exits 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plan 001 has not landed (this plan assumes guarded reads as the norm).
- The operator decides employees must NOT see cross-employee per-question
  averages — that changes `getEmployeeResults` (out of scope here); pause and
  get the policy.
- The sidebar's role-gating pattern is not conditional-per-item as assumed —
  report the actual pattern.

## Maintenance notes

- Release-timing policy (show results as soon as the evaluator completes vs
  only after HR closes the evaluation) was defaulted to "on completion" —
  revisit with HR stakeholders; the filter is one line in `getMyResults`.
- If plan 009's CSV export should also exist for the employee's own view,
  it's the same pure-builder pattern.
