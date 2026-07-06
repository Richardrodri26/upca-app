# Plan 005: Establish a verification baseline — typecheck script, working lint, Vitest, CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- package.json biome.json src/features/results/utils`
> If `package.json` scripts or `iap.ts` changed since `6674b8e`, compare
> against the excerpts below before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (best executed after 002/003 so the new tests assert the FIXED behavior; can run before — see Step 5 note)
- **Category**: tests / dx
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

This repo has NO one-command way to know it works: no test runner, no test
files, no `typecheck` script, no CI — and the one existing gate, `pnpm lint`,
FAILS with 122 errors (mostly auto-fixable import ordering) so nobody can see
a real error in the noise. Meanwhile `pnpm build` runs
`prisma migrate deploy && next build` — mistakes are discovered at deploy
time against the production database. For a thesis defended on the
correctness of computed metrics (IAP/IRTO/scores), the metric functions are
pure, deterministic, and completely untested. This plan gives the repo a
green baseline: `pnpm typecheck && pnpm lint && pnpm test` all exit 0, run on
every PR by CI.

## Current state

- `package.json:5-11` — scripts today:

  ```json
  "scripts": {
    "dev": "next dev",
    "build": "prisma migrate deploy && next build",
    "start": "next start",
    "lint": "biome check",
    "format": "biome format --write"
  }
  ```

- Verified baseline (2026-07-05): `npx tsc --noEmit` → **exit 0, clean**.
  `pnpm lint` → **122 errors, 15 warnings**, breakdown:
  - 57 × `assist/source/organizeImports` (auto-fixable)
  - 10 × `lint/style/useImportType` (auto-fixable)
  - 3 × `lint/complexity/useLiteralKeys`, 2 × `lint/style/noNonNullAssertion`,
    2 × `lint/correctness/useExhaustiveDependencies`, 2 × `lint/correctness/noUnusedImports`,
    1 × `lint/suspicious/noDocumentCookie`, 1 × `lint/suspicious/noArrayIndexKey`
    (need real review, not just `--write`)
- `biome.json` — sound config: `recommended` + next/react domains, VCS
  ignore-file integration. Don't restructure it.
- No `.github/` directory. No `.env.example`. No test files
  (`**/*.{test,spec}.*` matches nothing under `src/`).
- Metric functions to test: `src/features/results/utils/iap.ts` —
  `calculateIAP(questions)` (filters fully-rated triples, counts avg ≥ 4.0,
  returns `{iap, ratedCount, totalCount}`), `calculateIRTO(seconds, baseline=120)`
  (clamps 0–100, returns 0 for ≤ 0 input), `metricColor(value)`
  (≥80 default / ≥60 secondary / else destructive). All pure.
- RAG response schema to pin: `src/lib/validators/rag.ts` —
  `GenerarEvaluacionResponseSchema` (shape: `{ preguntas: { preguntas: [{ afirmacion, pilar, manual_referencia, guia_evaluacion_min_max }], metadata: { tiempo_ejecucion_segundos } } }` — READ THE FILE for the exact shape
  before writing the fixture; do not trust this summary).
- Package manager: pnpm. TS strict mode already on (`tsconfig.json`).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install dev deps | `pnpm add -D vitest` | exit 0 |
| Typecheck | `pnpm typecheck` (created in Step 1) | exit 0 |
| Lint | `pnpm lint` | exit 0 AFTER Step 2 |
| Tests | `pnpm test` | all pass |

## Scope

**In scope**:
- `package.json` (scripts + vitest devDependency)
- Repo-wide auto-fixes from `biome check --write` (many files — mechanical)
- Targeted manual fixes for the ~11 non-auto-fixable lint findings
- `vitest.config.ts` (create)
- `src/features/results/utils/iap.test.ts` (create)
- `src/lib/validators/rag.test.ts` (create)
- `.github/workflows/ci.yml` (create)
- `.env.example` (create — variable NAMES only, NEVER values)

**Out of scope**:
- `src/generated/**` and `src/components/ui/**` — if biome flags them,
  exclude them in `biome.json` `files.includes` instead of editing them.
- Changing any runtime behavior beyond what a lint fix strictly requires.
  If a `useExhaustiveDependencies` fix would change effect behavior
  non-trivially, suppress with `biome-ignore` + a reason comment and note it
  in your report instead of refactoring.
- Integration tests with a database — future work.

## Git workflow

- Branch: `advisor/005-verification-baseline`
- Suggested commits (separate!): `chore(lint): apply biome auto-fixes` (the
  mechanical bulk), then `fix(lint): resolve remaining biome diagnostics`,
  then `test: add vitest with IAP/IRTO and RAG schema tests`, then `ci: add
  GitHub Actions workflow`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add scripts

In `package.json`:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Fix the lint baseline

1. `pnpm exec biome check --write .` — clears the ~67 auto-fixable
   (organizeImports, useImportType, some others). Commit this separately —
   it's a large mechanical diff.
2. `pnpm lint` — inspect the remaining ~11. Fix each properly:
   - `useExhaustiveDependencies` (2): review the effect; add the missing dep
     if safe, otherwise `biome-ignore lint/correctness/useExhaustiveDependencies: <reason>`.
   - `noDocumentCookie` (1): likely in auth-related client code — if it's
     intentional, suppress with a reason; if it's dead code, remove.
   - `noNonNullAssertion` (2): replace `!` with a proper narrow/guard.
   - `useLiteralKeys` (3), `noUnusedImports` (2), `noArrayIndexKey` (1):
     mechanical fixes.

**Verify**: `pnpm lint` → exit 0. `pnpm typecheck` → still exit 0.

### Step 3: Add Vitest

`pnpm add -D vitest`, then `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

(The alias mirrors `tsconfig.json`'s `@/*` → `src/*` mapping — verify it there.)

**Verify**: `pnpm test` → "no test files found" is expected UNTIL Step 4;
vitest exits non-zero on empty suites, so just confirm it RUNS and reports
zero files, then proceed (or pass `--passWithNoTests` mentally — Step 4
makes this moot).

### Step 4: Metric unit tests

`src/features/results/utils/iap.test.ts`, covering at minimum:

- `calculateIAP`: empty array → `{iap: 0, ratedCount: 0, totalCount: 0}`;
  all-null ratings → ratedCount 0; a partially-rated question
  (`{relevanceRating: 5, coherenceRating: null, adequacyRating: null}`) is
  NOT counted as rated (this is the plan-002 regression guard); boundary
  average exactly 4.0 counts as adequate ((4,4,4)); (5,4,2) avg 3.67 does not;
  mixed set produces the right percentage and rounding.
- `calculateIRTO`: 0 and negative seconds → irto 0; small generation time →
  clamps ≤ 100 and ≥ 0; default baseline 120 vs explicit baseline.
- `metricColor`: 80/79.9/60/59.9 boundaries.

`src/lib/validators/rag.test.ts`: build a fixture object matching the REAL
schema in `src/lib/validators/rag.ts` (read it first), assert
`GenerarEvaluacionResponseSchema.safeParse(fixture).success === true`, and
assert a mutated fixture (missing `afirmacion`) fails. This pins the contract
with the teammate's RAG service.

**Verify**: `pnpm test` → all pass (expect ~15+ tests).

### Step 5: Regression-guard note

If plans 002/003 have NOT landed yet, the partially-rated-question test in
Step 4 still passes (it tests `calculateIAP`, which was always correct) — no
ordering problem. Do not write tests importing from `actions.ts` files
(server-only imports; they need `headers()` context and a DB — out of scope).

### Step 6: CI workflow

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

(Check the `packageManager` field / lockfile version — if `pnpm-lock.yaml`
was generated by a different major, match it in `version:`. If `packageManager`
is declared in package.json, drop the explicit `version:` and let
pnpm/action-setup read it.)

**Verify**: `npx tsc --noEmit` unaffected; YAML parses
(`node -e "require('js-yaml')"` not needed — just review carefully or push to
a branch if the operator allows).

### Step 7: `.env.example`

Create `.env.example` with variable NAMES and placeholder text only — copy the
names from `src/types/env.d.ts` and grep:
`grep -rhoE "process\.env\.[A-Z_]+" src prisma.config.ts | sort -u`.
Expected names include: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `RAG_SERVICE_URL`, `HF_TOKEN` (verify against the grep).
NEVER copy actual values from `.env`. Do not open `.env` at all.

**Verify**: `.env.example` contains no string longer than a placeholder;
`git diff` shows no secret-looking values.

## Test plan

This plan IS the test plan. Done = `pnpm lint && pnpm typecheck && pnpm test`
all green locally and in CI.

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0 with ≥ 15 passing tests across 2 files
- [ ] `.github/workflows/ci.yml` exists and runs the three commands
- [ ] `.env.example` exists, names only
- [ ] No behavioral changes beyond lint fixes (`git diff` review)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `biome check --write` produces a diff in `src/generated/**` or
  `src/components/ui/**` — exclude those paths in `biome.json` instead and
  re-run.
- A `useExhaustiveDependencies` or `noDocumentCookie` fix requires changing
  runtime behavior in a way you can't verify manually — suppress with reason
  and report.
- The real `GenerarEvaluacionResponseSchema` shape differs so much from the
  summary here that the fixture is guesswork — read the validator file; if
  still ambiguous, STOP.

## Maintenance notes

- Every future plan's verification gates can now use
  `pnpm lint && pnpm typecheck && pnpm test`.
- Next test investments, in value order: integration tests for the Server
  Action guards (plans 001/003) against a disposable Postgres; a captured
  REAL RAG payload as the schema fixture (ask the teammate for one).
- CI intentionally does NOT run `pnpm build` (it would attempt
  `prisma migrate deploy`). If you want build checks in CI, split the script
  into `build` (next build only) and `deploy` (migrate + build) first —
  worth doing but it touches the Vercel config, so it was left out here.
