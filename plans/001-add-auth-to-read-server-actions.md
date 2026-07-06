# Plan 001: Enforce server-side auth on every read Server Action

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/features src/lib`
> This plan was written against the working tree at commit `6674b8e`, which
> already contained uncommitted changes (the knowledge-base feature). Trust
> the "Current state" excerpts below over the commit; if the live code doesn't
> match the excerpts, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

In Next.js, every exported function in a `"use server"` file is a publicly
callable POST endpoint. This app (an HR performance-evaluation system deployed
on Vercel with open self-registration) has ~10 read Server Actions with **no
authentication check at all**. `getEvaluationResults` returns every employee's
name, email, and performance score to any caller — including unauthenticated
ones. `getUsers` enumerates the entire user directory. `getAssignment` returns
any assignment (with responses) by guessable ID. The client-side role checks
that exist (`if (session?.user?.role !== "ADMIN") ...`) are UX, not a security
boundary. This plan adds the same server-side guard the mutations already use.

## Current state

Relevant files:

- `src/lib/auth-middleware.ts` — the auth helpers. **This is the pattern to
  use; do not invent a new one:**

  ```ts
  // src/lib/auth-middleware.ts:12
  export async function requireAuth(options?: { roles?: Role[] }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (options?.roles && options.roles.length > 0 &&
        !options.roles.includes(session.user.role as Role)) {
      redirect("/unauthorized");
    }
    return session;
  }
  ```

  Note there is NO `requireRole` helper despite what `AGENTS.md` says —
  `requireAuth({ roles: [...] })` is the real API.

- Exemplar of a correctly guarded read action (same file family, called via
  TanStack Query — proves the pattern works for reads):

  ```ts
  // src/features/results/actions.ts:12-13
  export async function getDashboardStats() {
    await requireAuth({ roles: ["ADMIN", "HR"] });
  ```

- The unguarded action with the smoking-gun comment:

  ```ts
  // src/features/results/actions.ts:96-98
  export async function getEvaluationResults(evaluationId: string) {
    // Role check handled client-side; server just returns data or null
    const [evaluation, assignments, questions] = await Promise.all([
  ```

Full list of unguarded read actions (verified individually):

| File | Function | Line (approx) | Guard to add |
|------|----------|---------------|--------------|
| `src/features/results/actions.ts` | `getEvaluationResults` | 96 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/assignments/actions.ts` | `getEvaluationAssignments` | 67 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/assignments/actions.ts` | `getAssignment` | 108 | `requireAuth()` + ownership check (see Step 3) |
| `src/features/assignments/actions.ts` | `getUsers` | 131 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/evaluations/actions.ts` | `getEvaluations` | 15 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/evaluations/actions.ts` | `getEvaluation` | 30 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/evaluations/actions.ts` | `getPositionsWithProcessedManual` | 46 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/positions/actions.ts` | all read exports | 13, 39 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/manuals/actions.ts` | `getPositionsWithoutManual`, `getManuals` | 9, 18 | `requireAuth({ roles: ["ADMIN", "HR"] })` |
| `src/features/knowledge-base/actions.ts` | `getKnowledgeBaseCargos` | 163 | `requireAuth({ roles: ["ADMIN", "HR"] })` |

Already correctly guarded — do NOT touch: `getDashboardStats`,
`getDashboardStatsForEmployee`, `getEmployeeResults` (has its own
session+ownership logic), `getMyAssignments`, all mutations.

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0, no output |
| Lint (scoped) | `pnpm exec biome check src/features` | no NEW errors vs. before your change (repo-wide lint is currently broken — see plan 005) |
| Dev server | `pnpm dev` | starts on :3000 |

Do NOT use `pnpm lint` as a gate — it currently fails with 122 pre-existing
errors (plan 005 fixes that).

## Scope

**In scope** (the only files you should modify):
- `src/features/results/actions.ts`
- `src/features/assignments/actions.ts`
- `src/features/evaluations/actions.ts`
- `src/features/positions/actions.ts`
- `src/features/manuals/actions.ts`
- `src/features/knowledge-base/actions.ts`

**Out of scope** (do NOT touch):
- `src/lib/auth-middleware.ts` — the helper is correct as-is.
- Client components / pages — their role checks stay (harmless UX).
- `middleware.ts` — route-level defense-in-depth is deliberately deferred
  (see Maintenance notes).
- Any mutation action — they are already guarded.

## Git workflow

- Branch: `advisor/001-auth-read-actions`
- Commit style: conventional commits (repo examples: `feat(ui): add evaluator
  context to sidebar...`). Suggested: `fix(security): require auth on read server actions`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Map the call sites

For each function in the table above, find its callers:
`grep -rn "getEvaluationResults\|getEvaluationAssignments\|getAssignment\|getUsers\|getEvaluations\|getPositionsWithProcessedManual" src --include=*.ts --include=*.tsx -l`

Expected: callers are hooks in `src/features/*/queries.ts` and pages under
`src/app/(dashboard)/`. Confirm none of the HR/ADMIN-gated functions are
called from an EMPLOYEE-facing flow (`/my-evaluations/*` pages use
`getMyAssignments` + `getAssignment` only). If an EMPLOYEE-facing page calls a
function you are about to gate to HR/ADMIN, STOP and report.

**Verify**: list of call sites collected; no HR/ADMIN-gated function is called
from `src/app/(dashboard)/my-evaluations/**`.

### Step 2: Add role guards to the plain HR/ADMIN reads

For every function in the table except `getAssignment`, add as the FIRST line
of the function body:

```ts
await requireAuth({ roles: ["ADMIN", "HR"] });
```

Ensure `requireAuth` is imported from `@/lib/auth-middleware` in each file
(already imported in all six files — verify).

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Add ownership check to `getAssignment`

`getAssignment` is used by the evaluator's response form
(`/my-evaluations/[assignmentId]`), so it must allow the assigned evaluator OR
HR/ADMIN — mirror the ownership pattern already used in `submitResponse`
(`src/features/assignments/actions.ts:164-166`):

```ts
export async function getAssignment(assignmentId: string) {
  const session = await requireAuth();

  const assignment = await prisma.evaluationAssignment.findUnique({
    /* ...existing include unchanged... */
  });

  if (!assignment) return null;

  const isOwner = assignment.evaluatorId === session.user.id;
  const isManager = session.user.role === "ADMIN" || session.user.role === "HR";
  if (!isOwner && !isManager) return null;

  return assignment;
}
```

Note: `evaluatorId` is not in the current `include`'s selected fields for the
top-level row — it IS available because `findUnique` returns all scalar fields
of the model by default when using `include` (not `select`). Confirm by
hovering the type or with tsc.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Manual smoke test

1. `pnpm dev`
2. Sign in as an HR/ADMIN user → dashboard, evaluations list, results page,
   assignments page all load as before.
3. Sign in as an EMPLOYEE (or create one via sign-up) → `/my-evaluations`
   still lists assignments where they are evaluator, and opening one still
   renders the Likert form (this exercises `getMyAssignments` + `getAssignment`).
4. As the EMPLOYEE, navigate directly to `/evaluations/<some-id>/results` →
   the page's client guard shows "No tiene permisos"; the network tab shows
   the server action redirecting rather than returning data.

**Verify**: all four checks pass; specifically check the EMPLOYEE flow in
step 3 did not break (the most likely regression).

## Test plan

There is no test infrastructure yet (plan 005 adds it). Verification for this
plan is `tsc` + the manual smoke test above. When plan 005 lands, its
integration tests should cover: unauthenticated call to `getEvaluationResults`
does not return data; EMPLOYEE calling `getUsers` does not return data;
evaluator can `getAssignment` for own assignment but not another's.

## Done criteria

- [ ] Every function in the Step 2 table begins with `await requireAuth(...)`
- [ ] `grep -n "Role check handled client-side" src/features/results/actions.ts` → no matches
- [ ] `npx tsc --noEmit` exits 0
- [ ] Manual smoke test passes for both HR and EMPLOYEE flows
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- An EMPLOYEE-facing page/hook calls a function this plan gates to HR/ADMIN
  (found in Step 1) — report the call site instead of guessing a role policy.
- The `getAssignment` ownership check breaks the `/my-evaluations/[assignmentId]`
  page for a legitimate evaluator.
- The code at the cited locations doesn't match the excerpts.

## Maintenance notes

- Every NEW Server Action must start with `requireAuth(...)` — reads included.
  Consider adding this to `AGENTS.md` (plan 006 touches that file).
- Deferred: a `middleware.ts` for route-level defense-in-depth. The action
  guards are the real boundary; middleware would only add belt-and-suspenders.
- `requireAuth` uses `redirect()`, which throws — callers via TanStack Query
  will surface it as a navigation, matching current behavior of
  `getDashboardStats`. If the app ever needs JSON error responses instead,
  change `requireAuth` once, not the call sites.
