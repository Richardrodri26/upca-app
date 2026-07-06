# Plan 004: Harden the RAG service boundary — timeouts, logging, config, upload limits

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6674b8e..HEAD -- src/lib/rag-client.ts src/features/knowledge-base`
> IMPORTANT: `src/lib/rag-client.ts` and the knowledge-base feature were
> UNCOMMITTED work when this plan was written — the excerpts below describe the
> working tree, not commit `6674b8e`. Trust the excerpts; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security / bug
- **Planned at**: commit `6674b8e` (+ uncommitted working tree), 2026-07-05

## Why this matters

All RAG calls go through `src/lib/rag-client.ts` to a HuggingFace Space. Four
problems at this boundary:

1. **No timeouts.** Every `fetch` has no `signal`. A cold/hung HF Space leaves
   the Server Action (and the user's request) pending until the platform's
   global timeout — indefinite spinner, tied-up connections.
2. **Raw payload logging in production.** Line 94 logs the ENTIRE generation
   response (all question text derived from company manuals) to Vercel logs on
   every successful generation.
3. **Hardcoded service URL fallback.** A missing `RAG_SERVICE_URL` env
   silently falls back to a hardcoded host baked into source, hiding
   misconfiguration.
4. **Upload validation is extension-only.** `procesarDocumento` checks
   `file.name.split(".").pop()` and nothing else — no size cap, no MIME check —
   then proxies the file to the teammate's RAG service.

## Current state

- `src/lib/rag-client.ts:15-17` — config:

  ```ts
  const RAG_SERVICE_URL =
    process.env.RAG_SERVICE_URL ?? "https://rafael-0001-agente-rh.hf.space";
  const HF_TOKEN = process.env.HF_TOKEN;
  ```

- Six fetch sites, all timeout-less, all with the same shape (`try/fetch/
  !response.ok → error string / json → safeParse → Result`):
  - `getCargos` :47 (GET `/api/cargos`)
  - `generateEvaluation` :77 (POST `/api/evaluacion/generar`) — slow by nature
    (LLM generation; `tiempo_ejecucion_segundos` in the response metadata)
  - `procesarDocumentoRAG` :133 (POST `/api/base_conocimiento/procesar`, multipart)
  - `guardarCargoRAG` :168 (POST `/api/base_conocimiento/guardar`)
  - `obtenerContenidoCargoRAG` :204 (GET `/api/base_conocimiento/contenido`)
  - `eliminarCargoRAG` :237 (DELETE `/api/base_conocimiento/eliminar`)

- The debug logs:

  ```ts
  // rag-client.ts:94
  console.log("[RAG] Raw response:", JSON.stringify(json, null, 2));
  // rag-client.ts:99
  console.error("[RAG] Validation error:", parsed.error.flatten());
  ```

- `src/features/knowledge-base/actions.ts:14-36` — upload validation:

  ```ts
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") {
    return { success: false as const, error: "Solo se aceptan archivos PDF o DOCX" };
  }
  ```

- Error-result convention in this file: every function returns
  `Result<T> = { success: true; data: T } | { success: false; error: string }`
  and catches network errors into
  `{ success: false, error: "No se pudo conectar con el servicio RAG" }`. Keep it.

## Commands you will need

| Purpose   | Command | Expected on success |
|-----------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Dev       | `pnpm dev` | starts on :3000 |

## Scope

**In scope**:
- `src/lib/rag-client.ts`
- `src/features/knowledge-base/actions.ts` (only `procesarDocumento`'s validation block)

**Out of scope**:
- `src/lib/validators/rag.ts` — response schemas are correct.
- `src/features/manuals/**` — uses the client, unaffected by these changes.
- Retry logic / circuit breakers — out of scope for a thesis app.
- Magic-byte (file signature) validation — deferred; see Maintenance notes.

## Git workflow

- Branch: `advisor/004-rag-hardening`
- Suggested commit: `fix(rag): request timeouts, prod-safe logging, fail-fast config, upload limits`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Fail fast on missing config

Replace the module-level constants with a lazy getter (module-level `throw`
would break builds where the env is absent):

```ts
function getRagBaseUrl(): string {
  const url = process.env.RAG_SERVICE_URL;
  if (!url) {
    throw new Error("RAG_SERVICE_URL no está configurada");
  }
  return url;
}
```

Replace every `${RAG_SERVICE_URL}` interpolation with `${getRagBaseUrl()}`
(inside the existing `try` blocks, so a missing env surfaces as the friendly
connection error — but add the specific message: extend each `catch` to
`catch (e)` and return `e instanceof Error && e.message.includes("RAG_SERVICE_URL")
? { success: false, error: e.message } : { success: false, error: "No se pudo conectar con el servicio RAG" }`
— or simpler: hoist the check into a shared helper, your choice, as long as a
missing env produces a distinguishable error string). Delete the hardcoded
fallback host entirely.

Operator note: `RAG_SERVICE_URL` must be present in local `.env` and in
Vercel project env — confirm with the operator before deploying.

**Verify**: `npx tsc --noEmit` → exit 0, and
`grep -n "hf.space" src/lib/rag-client.ts` → no matches.

### Step 2: Add per-call timeouts

Add to each `fetch` an `AbortSignal.timeout(...)` (Node 18+/Next 16 supports
it natively):

| Function | Timeout |
|----------|---------|
| `generateEvaluation` | 180_000 (LLM generation is legitimately slow) |
| `procesarDocumentoRAG` | 120_000 (document parsing) |
| all others | 15_000 |

Pattern:

```ts
const response = await fetch(url, {
  method: "POST",
  headers: buildHeaders(),
  body: JSON.stringify({ cargo, enfoque }),
  signal: AbortSignal.timeout(180_000),
});
```

Timeout aborts throw a `TimeoutError` DOMException — the existing `catch`
already converts it to the friendly error. Optionally distinguish:
`error: "El servicio RAG tardó demasiado en responder"` when
`e instanceof DOMException && e.name === "TimeoutError"`.

**Verify**: `npx tsc --noEmit` → exit 0, and
`grep -c "AbortSignal.timeout" src/lib/rag-client.ts` → 6.

### Step 3: Make logging production-safe

Remove the raw-payload log at :94 entirely. Keep a lean validation-failure
log (it's the one diagnostic that matters when the teammate's API changes),
but without dumping the payload:

```ts
if (!parsed.success) {
  console.error("[RAG] Respuesta no coincide con el esquema:", parsed.error.flatten().fieldErrors);
  return { success: false, error: "Respuesta inesperada del servicio RAG" };
}
```

**Verify**: `grep -n "Raw response" src/lib/rag-client.ts` → no matches.

### Step 4: Upload size + MIME validation

In `src/features/knowledge-base/actions.ts`, extend the validation block in
`procesarDocumento` (keep the extension check):

```ts
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// after the extension check:
if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
  return { success: false as const, error: "El archivo debe pesar entre 1 byte y 10 MB" };
}
if (file.type && !ALLOWED_MIME.has(file.type)) {
  return { success: false as const, error: "Tipo de archivo no permitido" };
}
```

(`file.type` can be empty depending on the browser — that's why it's checked
only when present, and why the extension check stays.)

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 5: Manual smoke test

1. `pnpm dev` with a valid `RAG_SERVICE_URL`: knowledge-base list loads,
   uploading a small real PDF works, generating an evaluation works.
2. Temporarily unset `RAG_SERVICE_URL` (restart dev): the knowledge-base page
   shows the config error instead of silently calling the old hardcoded host.
   Restore the env afterwards.
3. Try uploading a >10 MB file → rejected with the size message.

**Verify**: all three pass.

## Test plan

Deferred to plan 005 infra. Highest-value future test: fixture-based test
pinning `GenerarEvaluacionResponseSchema` against a captured real RAG payload
(the contract seam between the two thesis repos).

## Done criteria

- [ ] `grep -n "hf.space" src/lib/rag-client.ts` → no matches
- [ ] `grep -c "AbortSignal.timeout" src/lib/rag-client.ts` → 6
- [ ] `grep -n "Raw response" src/lib/rag-client.ts` → no matches
- [ ] Upload rejects >10 MB and disallowed MIME, still accepts real PDF/DOCX
- [ ] `npx tsc --noEmit` exits 0
- [ ] Manual smoke test passes
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `rag-client.ts` no longer matches the six-function shape described (the
  file was uncommitted when planned — it may have evolved).
- Generation legitimately exceeds the 180 s timeout against the real service —
  report; the number needs operator input, don't just raise it.
- Removing the URL fallback breaks a deploy pipeline that relied on it.

## Maintenance notes

- Deferred: magic-byte validation of uploads (extension+MIME+size is
  proportionate for an internal thesis tool; revisit if exposed publicly).
- Deferred: surfacing generation progress (long timeout = long spinner; a
  polling/job pattern is the real fix if the RAG service ever supports it).
- The timeout constants are inline; if the teammate's service changes
  performance characteristics, they're the first knob.
- Operator follow-ups: ensure `RAG_SERVICE_URL` is set in Vercel env, and
  consider rotating `HF_TOKEN` if logs were ever shared (raw responses were
  logged, not the token — rotation is precautionary, not urgent).
