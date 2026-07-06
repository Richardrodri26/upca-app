# Plan 002: Stop single-dimension IAP ratings from zeroing the other two dimensions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/features/evaluations`
> Written against the working tree at `6674b8e`. If the excerpts below don't
> match the live code, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (tests for this live in plan 005)
- **Category**: bug
- **Planned at**: commit `6674b8e`, 2026-07-05

## Why this matters

The IAP (Índice de Adecuación de Preguntas) is the central quality metric of
this graduation thesis: the % of AI-generated questions whose three HR ratings
(pertinencia, coherencia, adecuación) average ≥ 4.0. Today, the moment HR
rates ONE dimension, the client sends `0` for the other two (`?? 0` fallback),
the server persists those zeros, and `calculateIAP` counts the question as
fully rated: a "Pertinencia: 5" click enters the index as `(5+0+0)/3 = 1.67`.
The dashboard IAP is systematically understated under normal usage. Zero is
not even a selectable value in the UI (stars are 1–5), so every stored 0 is
corruption, which also makes the data repairable.

## Current state

- `src/features/evaluations/components/question-review-card.tsx` — the review
  card. Three `RatingSelector`s; each `onChange` sends ALL three fields,
  defaulting unset siblings to 0:

  ```tsx
  // question-review-card.tsx:212-221
  <RatingSelector
    label="Pertinencia"
    value={question.relevanceRating}
    onChange={(v) =>
      onRate(question.id, {
        relevanceRating: v,
        coherenceRating: question.coherenceRating ?? 0,   // ← bug
        adequacyRating: question.adequacyRating ?? 0,     // ← bug
      })
    }
  />
  ```

  (Same pattern repeated for "Coherencia" at :223-233 and "Adecuación" at
  :234-244.)

- `src/features/evaluations/actions.ts:172-188` — the Server Action persists
  whatever arrives, no validation:

  ```ts
  export async function rateQuestion(
    id: string,
    ratings: {
      relevanceRating: number;
      coherenceRating: number;
      adequacyRating: number;
    },
  ) {
    await requireAuth({ roles: ["ADMIN", "HR"] });
    await prisma.question.update({ where: { id }, data: ratings });
    return { success: true };
  }
  ```

- `src/features/results/utils/iap.ts:18-23` — `calculateIAP` treats any
  non-null triple as "rated" (this function is CORRECT and must not change):

  ```ts
  const ratedQuestions = questions.filter(
    (q) =>
      q.relevanceRating != null &&
      q.coherenceRating != null &&
      q.adequacyRating != null,
  );
  ```

- Prisma schema: `relevanceRating Int?`, `coherenceRating Int?`,
  `adequacyRating Int?` on `Question` — nullable, so "unrated" is `null`.

- Zod conventions: schemas live in `src/lib/validators/*.ts`, e.g.
  `src/lib/validators/assignment.ts:20-28` defines
  `value: z.number().int().min(1).max(5)`. Match that style.

- The `onRate` prop chain: `question-review-card.tsx` → review page
  (`src/app/(dashboard)/evaluations/[id]/review/page.tsx`) → a mutation hook in
  `src/features/evaluations/mutations.ts` → `rateQuestion`. You will need to
  update the types along this chain; `tsc` will point at each link.

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Backfill  | `pnpm exec tsx scripts/backfill-zero-ratings.ts` | prints count of repaired rows, exit 0 |
| Dev       | `pnpm dev` | starts on :3000 |

`tsx` and `dotenv` are already devDependencies; Prisma env loading needs
dotenv (see `prisma.config.ts` for how the repo loads env).

## Scope

**In scope**:
- `src/features/evaluations/components/question-review-card.tsx`
- `src/features/evaluations/actions.ts` (only `rateQuestion`)
- `src/features/evaluations/mutations.ts` (type updates on the rate mutation)
- `src/app/(dashboard)/evaluations/[id]/review/page.tsx` (type updates only)
- `src/lib/validators/evaluation.ts` (add the ratings schema)
- `scripts/backfill-zero-ratings.ts` (create)

**Out of scope**:
- `src/features/results/utils/iap.ts` — `calculateIAP` is correct; the fix is
  upstream. Do not "compensate" there.
- `submitResponse` validation — that's plan 003.
- Prisma schema/migrations — no schema change needed.

## Git workflow

- Branch: `advisor/002-iap-rating-fix`
- Suggested commit: `fix(evaluations): partial IAP rating updates, stop zeroing unrated dimensions`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make `rateQuestion` accept a validated partial update

In `src/lib/validators/evaluation.ts`, add:

```ts
export const rateQuestionSchema = z
  .object({
    relevanceRating: z.number().int().min(1).max(5).optional(),
    coherenceRating: z.number().int().min(1).max(5).optional(),
    adequacyRating: z.number().int().min(1).max(5).optional(),
  })
  .refine((r) => Object.keys(r).length > 0, {
    error: "Debe calificar al menos una dimensión",
  });
export type RateQuestionInput = z.infer<typeof rateQuestionSchema>;
```

(Note: this repo uses Zod 4 — error messages use `{ error: "..." }`, matching
`src/lib/validators/assignment.ts`.)

In `rateQuestion`, parse before writing and make the param partial:

```ts
export async function rateQuestion(id: string, ratings: RateQuestionInput) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const parsed = rateQuestionSchema.safeParse(ratings);
  if (!parsed.success) {
    return { success: false, error: "Calificación inválida (1-5)" };
  }
  await prisma.question.update({ where: { id }, data: parsed.data });
  return { success: true };
}
```

A partial object in `data` leaves the other columns untouched — that is the
core of the fix.

**Verify**: `npx tsc --noEmit` → errors ONLY at the call sites you'll fix in
Step 2 (or exit 0 if types happen to be compatible).

### Step 2: Send only the changed dimension from the review card

In `question-review-card.tsx`, change each of the three `onChange` handlers to
send just its own field:

```tsx
<RatingSelector
  label="Pertinencia"
  value={question.relevanceRating}
  onChange={(v) => onRate(question.id, { relevanceRating: v })}
/>
```

(Repeat for Coherencia → `{ coherenceRating: v }` and Adecuación →
`{ adequacyRating: v }`.) Update the `onRate` prop type and the mutation hook
signature in `src/features/evaluations/mutations.ts` to the partial type
(`RateQuestionInput`). Follow the type errors from `tsc`.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Repair existing corrupted rows

Create `scripts/backfill-zero-ratings.ts`:

```ts
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const r = await prisma.question.updateMany({
    where: { relevanceRating: 0 },
    data: { relevanceRating: null },
  });
  const c = await prisma.question.updateMany({
    where: { coherenceRating: 0 },
    data: { coherenceRating: null },
  });
  const a = await prisma.question.updateMany({
    where: { adequacyRating: 0 },
    data: { adequacyRating: null },
  });
  console.log(`Repaired: relevance=${r.count} coherence=${c.count} adequacy=${a.count}`);
}

main().then(() => process.exit(0));
```

Rationale: 0 is unreachable through the UI (stars are 1–5), so every 0 is the
`?? 0` bug — resetting to `null` returns those dimensions to "unrated". Run it
against the dev database. NOTE for the operator: this must also be run once
against the production database after deploy.

**Verify**: `pnpm exec tsx scripts/backfill-zero-ratings.ts` → prints counts,
exit 0. Running it a second time prints all zeros (idempotent).

### Step 4: Manual smoke test

1. `pnpm dev`, sign in as HR, open an evaluation in review.
2. Rate ONLY "Pertinencia" on a question → reload → Coherencia and Adecuación
   still show as unrated (no stars filled).
3. Rate the remaining two dimensions → dashboard IAP now counts the question,
   with the true average.

**Verify**: step 2's reload shows the other dimensions unrated — that is the
regression this plan exists to fix.

## Test plan

Plan 005 introduces Vitest. Once it lands, add to
`src/features/results/utils/iap.test.ts` (created by plan 005): a case
asserting a question with `{ relevance: 5, coherence: null, adequacy: null }`
is NOT counted as rated. No test work required inside this plan.

## Done criteria

- [ ] `grep -n "?? 0" src/features/evaluations/components/question-review-card.tsx` → no matches
- [ ] `rateQuestion` validates with `rateQuestionSchema` and accepts partials
- [ ] `npx tsc --noEmit` exits 0
- [ ] Backfill script exists, runs, and is idempotent
- [ ] Manual smoke test passes (unrated dimensions stay unrated)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The `onRate` chain doesn't match the described flow (card → review page →
  mutations.ts → action) — report what you find instead.
- You find rating values of 0 that a stakeholder claims are legitimate.
- Any excerpt above doesn't match the live code.

## Maintenance notes

- Reviewer should scrutinize: the mutation hook's optimistic-update logic (if
  any) must also stop merging `?? 0`.
- The backfill script is a one-off; delete it after production has been
  repaired, or leave it in `scripts/` documented as historical.
- If a "clear rating" feature is ever added, extend `rateQuestionSchema` to
  accept explicit `null` — today's schema deliberately rejects it.
