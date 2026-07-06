# Plan 007: Performance and dead-code quick wins

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/features/assignments/actions.ts src/features/results/actions.ts "src/app/(dashboard)/page.tsx" package.json`
> On mismatch with the excerpts below, STOP.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: 003 (both edit `src/features/assignments/actions.ts` — run 003 first to avoid conflicts). 005 recommended first (gives you `pnpm test` as a gate).
- **Category**: perf / tech-debt
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

Four independent, low-risk wins:

1. `assignEvaluation` issues one INSERT per employee pair, serialized, against
   serverless Postgres (Neon) — a 50-person assignment is 50 sequential
   round trips, each paying pooler+TLS latency.
2. `getEmployeeResults` fetches EVERY response of the whole evaluation
   (assignments × questions rows) into memory to compute per-question
   averages with an O(questions × responses) filter loop — on every view of a
   single employee's results page. Postgres can do this in one `groupBy`.
3. Dead code confuses readers: a ternary whose branches are identical, and
   two junk files tracked in git (`docs/consumir_api.py` is 0 bytes).
4. `shadcn` (a code-generator CLI, never imported at runtime) sits in
   production `dependencies` with a pnpm patch.

## Current state

- `src/features/assignments/actions.ts:33-57` — the insert loop:

  ```ts
  let created = 0;
  let skipped = 0;
  for (const { employeeId, evaluatorId } of pairs) {
    try {
      await prisma.evaluationAssignment.create({
        data: { evaluationId, employeeId, evaluatorId, status: "PENDING" },
      });
      created++;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skipped++;
      } else { throw error; }
    }
  }
  ```

  The unique constraint being relied on: `@@unique([evaluationId, employeeId])`
  on `EvaluationAssignment`. NOTE: if plan 003 ran first, this function now
  begins with a Zod parse — keep it.

- `src/features/results/actions.ts:187-206` — the over-fetch in
  `getEmployeeResults`:

  ```ts
  prisma.response.findMany({
    where: { assignment: { evaluationId } },
    select: { questionId: true, value: true },
  }),
  // ...
  for (const q of questions) {
    const responses = allResponses.filter((r) => r.questionId === q.id);
    if (responses.length > 0) {
      const avg = responses.reduce((s, r) => s + r.value, 0) / responses.length;
      questionAverages.set(q.id, Math.round(avg * 10) / 10);
    }
  }
  ```

- `src/app/(dashboard)/page.tsx:260-268` — the dead ternary (both branches
  identical):

  ```tsx
  <Link
    href={
      a.status === "COMPLETED"
        ? `/my-evaluations/${a.id}`
        : `/my-evaluations/${a.id}`
    }
  ```

- `package.json:28` — `"shadcn": "^4.11.0"` in `dependencies`, with
  `patchedDependencies["shadcn@4.11.0"]` at :43. Grep of `src` shows no
  `from "shadcn"` import.

- Tracked junk: `docs/consumir_api.py` (0 bytes) and
  `docs/consumir_api (1).py` (a browser-download duplicate name; currently
  also has uncommitted modifications — see STOP conditions).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Tests (if plan 005 landed) | `pnpm test` | all pass |
| Dev | `pnpm dev` | starts on :3000 |

## Scope

**In scope**:
- `src/features/assignments/actions.ts` (only the `assignEvaluation` loop)
- `src/features/results/actions.ts` (only `getEmployeeResults`)
- `src/app/(dashboard)/page.tsx` (only the dead ternary)
- `package.json` + `pnpm-lock.yaml` (move `shadcn` to devDependencies)
- Deleting `docs/consumir_api.py` and `docs/consumir_api (1).py` from git

**Out of scope**:
- The "Exportar Resultados" no-op button in
  `src/app/(dashboard)/evaluations/[id]/results/page.tsx:81` — plan 009
  implements it. DO NOT remove it.
- `getEvaluationResults` payload trimming — it feeds the results page AND
  plan 009's CSV export; touching its shape now creates churn. Deferred (see
  Maintenance notes).
- Pagination of list queries — deliberately rejected at current scale (see
  plans/README.md "considered and rejected").
- Any UI component refactors (status badges etc.) — separate concern, noted
  in README as deferred.

## Git workflow

- Branch: `advisor/007-perf-quick-wins`
- Suggested commits: `perf(assignments): batch assignment creation with createMany`,
  `perf(results): compute question averages in the database`,
  `chore: remove dead code and junk files, move shadcn to devDependencies`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Batch the assignment inserts

Replace the loop in `assignEvaluation` with:

```ts
const result = await prisma.evaluationAssignment.createMany({
  data: pairs.map(({ employeeId, evaluatorId }) => ({
    evaluationId,
    employeeId,
    evaluatorId,
    status: "PENDING" as const,
  })),
  skipDuplicates: true,
});
const created = result.count;
const skipped = pairs.length - created;
```

Keep the existing return shape `{ success: true, created, skipped }` and the
`revalidatePath` call. Remove the now-unused `Prisma` import IF nothing else
in the file uses it (grep the file).

**Verify**: `npx tsc --noEmit` → exit 0. Manual: assign 2 pairs where 1
already exists → response reports `created: 1, skipped: 1`.

### Step 2: Push question averages into the database

In `getEmployeeResults`, replace the `allResponses` fetch + filter loop with a
groupBy:

```ts
const grouped = await prisma.response.groupBy({
  by: ["questionId"],
  where: { assignment: { evaluationId } },
  _avg: { value: true },
});
const questionAverages = new Map(
  grouped
    .filter((g) => g._avg.value != null)
    .map((g) => [g.questionId, Math.round((g._avg.value as number) * 10) / 10]),
);
```

Remove `allResponses` from the `Promise.all` and delete the manual loop. The
rest of the function (employee's own responses, the return shape) is
unchanged — consumers must see an identical payload.

**Verify**: `npx tsc --noEmit` → exit 0. Manual: an employee-results page
shows the same "Promedio general" values as before the change (compare
against a note you take BEFORE editing).

### Step 3: Dead ternary

In `src/app/(dashboard)/page.tsx:260-268`, collapse to
`href={`/my-evaluations/${a.id}`}`. Leave the label ternary at :268
(`"Ver" : "Responder"`) — that one is real.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: Dependency hygiene

1. Move `"shadcn": "^4.11.0"` from `dependencies` to `devDependencies` in
   `package.json` (keep the patch entry — it applies wherever the package is
   installed). First confirm: `grep -rn "from \"shadcn\"\|require(\"shadcn\")" src` → no matches, and check `package.json` scripts don't invoke it.
2. `pnpm install` to update the lockfile.
3. `git rm "docs/consumir_api.py" "docs/consumir_api (1).py"` — NOTE the
   second file has uncommitted modifications in the working tree; see STOP
   conditions before deleting.

**Verify**: `pnpm install` → exit 0; `pnpm dev` still starts; `git status`
shows the two files deleted.

## Test plan

If plan 005 landed: `pnpm test` stays green (no tested code paths change
shape). The behavioral equivalence of Step 2 is verified manually (same
averages before/after) — a future integration test should pin it.

## Done criteria

- [ ] `grep -n "for (const { employeeId, evaluatorId }" src/features/assignments/actions.ts` → no matches
- [ ] `grep -n "allResponses" src/features/results/actions.ts` → no matches
- [ ] Dead ternary gone; link renders for both statuses
- [ ] `shadcn` under `devDependencies`; lockfile updated; app still runs
- [ ] `docs/consumir_api*.py` no longer tracked
- [ ] `npx tsc --noEmit` exits 0 (and `pnpm test` green if it exists)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `createMany` + `skipDuplicates` isn't supported by the Postgres driver
  adapter version in use (it is on standard Prisma 7 + pg — but verify the
  first run).
- The average values differ between before/after in Step 2 — report, don't
  massage the rounding until it matches.
- `docs/consumir_api (1).py` has uncommitted changes someone is actively
  using — confirm with the operator before `git rm` (it may be the teammate's
  API sample being edited).
- Any `package.json` script or config references the `shadcn` binary.

## Maintenance notes

- Deferred consciously: trimming `getEvaluationResults`' payload (it ships
  full question texts to render a count). Revisit AFTER plan 009 (CSV export)
  decides what data the client actually needs.
- If bulk-assignment grows a "reassign evaluator" feature, `skipDuplicates`
  will silently ignore those rows — the counts logic must then distinguish
  "existed with same evaluator" from "existed with different evaluator".
