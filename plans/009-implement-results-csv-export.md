# Plan 009: Make the "Exportar Resultados" button actually export (CSV)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- "src/app/(dashboard)/evaluations/[id]/results" src/features/results`
> On mismatch with the excerpts below, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (results action gets auth — export must not ship before
  the data it exports is protected)
- **Category**: direction
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

The evaluation-results page renders a visible "Exportar Resultados" button
whose handler is literally `onClick={() => {}}` — a no-op. The roadmap marks
export as done. For an HR tool (and a thesis defense) "take the results out of
the app" is a core expectation, and every piece of data needed is ALREADY
assembled by `getEvaluationResults` and sitting in the page's TanStack Query
cache. This is the cheapest visible feature in the repo: a client-side CSV
download, zero new dependencies, zero new server code.

## Current state

- The button, in `src/app/(dashboard)/evaluations/[id]/results/page.tsx:81-83`
  (a `"use client"` page):

  ```tsx
  <Button variant="outline" onClick={() => {}} title="Exportar Resultados">
    Exportar Resultados
  </Button>
  ```

- The data already available in the same component (`:33`):
  `const { data: results } = useEvaluationResults(id);` where `results` is the
  return of `getEvaluationResults` (`src/features/results/actions.ts:96-151`):

  - `results.evaluation` — `{ id, title, status, positionName, generationTime }`
  - `results.assignments` — array of EvaluationAssignment rows with
    `employee: { id, name, email }`, `status`, `score`, `completedAt`
  - `results.overallAverageScore`, `results.completedCount`,
    `results.totalAssignments`, `results.iap`, `results.iapRatedCount`,
    `results.irto`

- UI conventions: shadcn `Button` from `@/components/ui/button`; page text in
  Spanish.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Dev | `pnpm dev` | starts on :3000 |

## Scope

**In scope**:
- `src/app/(dashboard)/evaluations/[id]/results/page.tsx`
- `src/features/results/utils/export-csv.ts` (create — pure function, testable)

**Out of scope**:
- PDF export — nice for the defensa, but it adds a dependency; deliberately
  deferred (see Maintenance notes).
- Server-side export endpoints — unnecessary; the data is already client-side.
- Changing `getEvaluationResults`'s payload.

## Git workflow

- Branch: `advisor/009-results-csv-export`
- Suggested commit: `feat(results): CSV export of evaluation results`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Pure CSV builder

Create `src/features/results/utils/export-csv.ts` with a pure function that
takes the `results` object and returns the CSV string. Requirements:

- UTF-8 with BOM prefix (`﻿`) so Excel opens accents correctly (the data
  is Spanish).
- Semicolon-safe: quote every field, escape inner quotes by doubling
  (standard CSV: `"a ""b"" c"`), use comma as separator.
- Layout: a metadata header block, then the assignments table:

  ```
  Evaluación,<title>
  Cargo,<positionName>
  Puntaje promedio,<overallAverageScore>
  IAP,<iap>%
  IRTO,<irto>%
  Completadas,<completedCount> de <totalAssignments>

  Empleado,Email,Estado,Puntaje,Completada el
  "Ana Pérez","ana@...","COMPLETED","4.2","2026-07-01"
  ```

- Dates via `toISOString().slice(0, 10)`; null score/date → empty field.
- Type the parameter structurally (the fields listed in Current state), or
  derive it: `type EvaluationResults = NonNullable<Awaited<ReturnType<typeof getEvaluationResults>>>` imported from the actions file (type-only import — safe across the
  server boundary).

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Wire the button

In the results page:

```tsx
const handleExport = () => {
  if (!results) return;
  const csv = buildResultsCsv(results);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resultados-${results.evaluation.title.replace(/[^\w\dáéíóúñ-]+/gi, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
// ...
<Button variant="outline" onClick={handleExport} disabled={!results} title="Exportar Resultados">
```

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Manual smoke test

1. `pnpm dev`, sign in as HR, open a results page with completed assignments.
2. Click "Exportar Resultados" → a `.csv` downloads.
3. Open it in Excel/LibreOffice: accents render (BOM works), one row per
   assignment, metadata block on top, empty score cells for non-completed.
4. Export an evaluation whose title contains a comma or quotes → file opens
   with intact columns (escaping works).

**Verify**: all four pass.

## Test plan

If plan 005 landed: `src/features/results/utils/export-csv.test.ts` — unit
tests for the pure builder: field escaping (comma, quote, newline in a name),
BOM prefix present, null score → empty cell, row count = assignments + header
lines. Model after `iap.test.ts`. `pnpm test` → green.

## Done criteria

- [ ] `grep -n "onClick={() => {}}" "src/app/(dashboard)/evaluations/[id]/results/page.tsx"` → no matches
- [ ] Clicking the button downloads a valid CSV (manual test above)
- [ ] `npx tsc --noEmit` exits 0
- [ ] Unit tests for the builder pass (if test infra exists)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated; also tick roadmap item 6.6's
  honesty — update `docs/roadmap.md` note if plan 006 hasn't already

## STOP conditions

- `results.assignments` shape differs from the Current state list (plan 007's
  deferred payload-trimming may have landed in between — coordinate).
- The page has been converted to a Server Component since planning (would
  change where the click handler lives).

## Maintenance notes

- PDF export (nicer for the defensa) can build on this: same data, render via
  `@react-pdf/renderer` or print stylesheet + `window.print()` — the zero-dep
  print-stylesheet route is worth trying first.
- If per-question breakdowns are wanted in the export, `results.questions` is
  already in the payload — a second CSV section, not a new fetch.
