# Plan 008: Consolidate the triplicated Position+Manual sync and stop swallowing its errors

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/lib/rag-sync.ts src/features/manuals/actions.ts src/features/knowledge-base/actions.ts`
> The knowledge-base feature was UNCOMMITTED when this plan was written —
> trust the excerpts below over the commit. On mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — touches the RAG↔DB sync critical path
- **Depends on**: 005 (verification baseline — you want green gates before
  refactoring this), 011 recommended first if the team runs it (the
  knowledge-base/manuals product decision may change what to consolidate)
- **Category**: tech-debt
- **Planned at**: commit `6674b8e` (+ uncommitted working tree), 2026-07-05

## Why this matters

"A cargo exists in the RAG service ⇒ a Position and a PROCESSED Manual row
exist in our DB" is an invariant implemented **three times, differently**:

- `guardarCargo` (knowledge-base) matches positions **case-insensitively**,
  creates with department `"Sin departamento"`, and wraps everything in
  `catch {}` — sync failures vanish silently.
- `syncWithRag` (lib) upserts positions by **exact name** — a cargo saved as
  "analista de sistemas" via knowledge-base and listed as "Analista de
  Sistemas" by the RAG produces a DUPLICATE position via this path.
- `registerManual` (manuals) does its own existence check against the RAG
  cargo list (case-insensitive) with a different Manual-creation flow.

The case-sensitivity drift is a live duplicate-Positions bug; the swallowed
errors mean the DB and the RAG store can disagree with zero signal. One
helper, one matching rule, surfaced errors.

## Current state

- `src/features/knowledge-base/actions.ts:60-105` (`guardarCargo`) — the
  find-or-create, best-effort variant:

  ```ts
  let positionId: string | null = null;
  try {
    const existing = await prisma.position.findFirst({
      where: { name: { equals: cargoName, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) { positionId = existing.id; }
    else {
      const created = await prisma.position.create({
        data: { name: cargoName, department: "Sin departamento" },
      });
      positionId = created.id;
    }
    // ...find-or-create/update Manual (fileName, positionId, uploadedById,
    //    status: "PROCESSED", externalRef: cargoName)...
  } catch {
    // DB sync is best-effort — RAG save succeeded either way
  }
  ```

  A second `catch {}` exists in `eliminarCargo` at :152-154 around
  `prisma.manual.deleteMany`.

- `src/lib/rag-sync.ts:31-53` (`syncWithRag`) — the exact-match variant:

  ```ts
  for (const cargo of cargos) {
    const position = await prisma.position.upsert({
      where: { name: cargo },        // ← EXACT match; drift point
      create: { name: cargo },
      update: {},
      include: { manual: true },
    });
    if (!position.manual) {
      await prisma.manual.create({
        data: { fileName: cargo, positionId: position.id,
                uploadedById: systemUser.id, status: "PROCESSED", externalRef: cargo },
      });
    }
  }
  ```

- `src/features/manuals/actions.ts:37-91` (`registerManual`) — creates a
  PENDING Manual for an EXISTING position, then flips it PROCESSED if the
  cargo appears (case-insensitively, :70-72) in the RAG list. This flow is
  legitimately different (position already exists, user-driven) — it shares
  only the "verify cargo exists in RAG" concern.

- Schema facts you need: `Position.name` is `@unique`; `Manual.positionId` is
  unique (1:1 Position↔Manual); `Manual.externalRef` stores the RAG cargo
  name; Manual statuses include `PENDING | PROCESSED | ERROR`.

- Conventions: shared infra lives in `src/lib/`; server-only code; errors as
  `{ success: false, error: string }` results, not throws (see any action
  file).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint+tests (post plan 005) | `pnpm lint && pnpm test` | exit 0 |
| Dev | `pnpm dev` | starts on :3000 |

## Scope

**In scope**:
- `src/lib/position-manual-sync.ts` (create — the consolidated helper)
- `src/lib/rag-sync.ts` (rewrite its loop on top of the helper)
- `src/features/knowledge-base/actions.ts` (`guardarCargo` + `eliminarCargo`
  error handling)
- `src/features/manuals/actions.ts` — ONLY if trivially reusable for the
  cargo-existence check; otherwise leave it (see Step 4).

**Out of scope**:
- Changing WHICH flows exist (knowledge-base vs manuals product question —
  that's plan 011).
- Renaming/merging existing Positions already duplicated in the DB — data
  repair needs operator input; report duplicates if found (Step 5).
- The RAG client itself.

## Git workflow

- Branch: `advisor/008-sync-consolidation`
- Suggested commit: `refactor(sync): single position+manual sync helper, case-insensitive matching, surfaced errors`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create the helper

`src/lib/position-manual-sync.ts` exporting one function:

```ts
import { prisma } from "@/lib/prisma";

/**
 * Ensure a Position and a PROCESSED Manual exist for a RAG cargo.
 * Matching rule (canonical): Position.name compared case-insensitively.
 * Returns the ids; throws on DB failure (callers decide how to surface).
 */
export async function syncPositionAndManual(opts: {
  cargoName: string;
  fileName: string;
  uploadedById: string;
}): Promise<{ positionId: string; manualId: string; createdPosition: boolean }> {
  const { cargoName, fileName, uploadedById } = opts;

  const existing = await prisma.position.findFirst({
    where: { name: { equals: cargoName, mode: "insensitive" } },
    select: { id: true },
  });
  const position =
    existing ??
    (await prisma.position.create({
      data: { name: cargoName, department: "Sin departamento" },
      select: { id: true },
    }));

  const existingManual = await prisma.manual.findFirst({
    where: { positionId: position.id },
    select: { id: true },
  });
  const manual = existingManual
    ? await prisma.manual.update({
        where: { id: existingManual.id },
        data: { fileName, status: "PROCESSED", externalRef: cargoName },
        select: { id: true },
      })
    : await prisma.manual.create({
        data: { fileName, positionId: position.id, uploadedById,
                status: "PROCESSED", externalRef: cargoName },
        select: { id: true },
      });

  return { positionId: position.id, manualId: manual.id, createdPosition: !existing };
}
```

(Adjust field details against the real schema — open `prisma/schema.prisma`
first. If `department` is required with no default, keep `"Sin departamento"`;
if it has a default, drop it.)

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Rewire `guardarCargo`

Replace its inline try/catch block with a call to `syncPositionAndManual`.
Surface failures instead of swallowing: RAG save succeeded but DB sync failed
is a REPORTABLE partial success:

```ts
let syncWarning: string | undefined;
try {
  await syncPositionAndManual({ cargoName, fileName: nombre_archivo, uploadedById: session.user.id });
} catch (e) {
  console.error("[KB] Sincronización DB falló tras guardar en RAG:", e);
  syncWarning = "Guardado en RAG, pero la sincronización con la base local falló. Usá 'Sincronizar' en Manuales.";
}
// include syncWarning in the success payload:
return { success: true as const, data: result.data, warning: syncWarning };
```

Check the client consumer of `guardarCargo` (grep in
`src/features/knowledge-base/`) and surface `warning` in the UI toast/message
if one exists; if the consumer ignores unknown fields, the type change is
additive and safe. Give `eliminarCargo`'s `catch {}` (:152) the same
treatment: log + warning, not silence.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Rewire `syncWithRag`

Replace the exact-match `upsert` loop with the helper (fixing the
case-sensitivity drift):

```ts
for (const cargo of cargos) {
  const r = await syncPositionAndManual({
    cargoName: cargo, fileName: cargo, uploadedById: systemUser.id,
  });
  synced++;
  if (r.createdPosition) created++;
}
```

Note the semantic change: previously `created` counted created MANUALS; keep
the counter semantics the caller displays (check `syncManualsWithRag`'s
consumer in the manuals UI) — if the UI says "nuevos", counting created
positions is the honest number; pick one and make the UI label match.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 4: `registerManual` — reuse only if free

`registerManual` serves a different flow (position pre-exists, manual starts
PENDING). Do NOT force it onto the helper. Only extract the shared
"cargo exists in RAG list, case-insensitive" check if it drops out naturally;
otherwise leave the function untouched and note it.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: Duplicate-position audit (read-only report)

Run a quick check for damage the old exact-match path already caused:
write a throwaway query (tsx script or Prisma Studio) listing Position names
that collide case-insensitively:
`SELECT LOWER(name), COUNT(*) FROM "Position" GROUP BY LOWER(name) HAVING COUNT(*) > 1`
(table name per schema — check `@@map` in `prisma/schema.prisma`). Report any
duplicates to the operator; do NOT merge them yourself.

**Verify**: report produced (even if empty).

### Step 6: Manual smoke test

1. Knowledge-base: upload + save a cargo whose name matches an existing
   position with different casing → NO new Position row; Manual updated.
2. Manuals page: "Sincronizar" against the RAG → counts sane, no duplicate
   positions created.
3. Delete a cargo from knowledge-base → Manual removed, warning surfaced if
   DB fails (hard to simulate — at minimum confirm the happy path).

**Verify**: all pass; #1 is the drift bug this plan fixes.

## Test plan

With plan 005 infra: `syncPositionAndManual` is testable against a dev DB but
there's no DB-test harness yet — keep it on the integration-test wishlist.
For now the smoke test + duplicate audit are the verification.

## Done criteria

- [ ] `grep -rn "mode: \"insensitive\"" src/lib/position-manual-sync.ts` → 1 match (the canonical rule lives in ONE place)
- [ ] `grep -n "catch {}\|catch {$" src/features/knowledge-base/actions.ts` → no silent catches (empty-catch pattern gone; catches log + surface)
- [ ] `src/lib/rag-sync.ts` no longer contains a `position.upsert` with exact-name `where`
- [ ] `npx tsc --noEmit` exits 0; `pnpm lint && pnpm test` green (if plan 005 landed)
- [ ] Duplicate-position report delivered
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plan 011's product decision (knowledge-base replaces manuals, or vice
  versa) has been made and contradicts this consolidation — reconcile with
  that decision first.
- `prisma/schema.prisma` shows constraints that break the helper's logic
  (e.g. `department` non-null without default AND used meaningfully — don't
  invent department data).
- The duplicate audit finds existing duplicated Positions with dependent
  evaluations — data repair is operator territory; report and stop.

## Maintenance notes

- The canonical matching rule (case-insensitive on `Position.name`) now lives
  in exactly one file — future cargo flows must call the helper, never inline
  their own find-or-create.
- Reviewer: scrutinize the counter semantics in Step 3 (synced/created) and
  the warning surfacing in the knowledge-base UI.
- Consider (future): a DB citext column or a normalized `nameKey` column with
  a unique index, making the case-insensitive uniqueness a DATABASE guarantee
  instead of an application convention.
