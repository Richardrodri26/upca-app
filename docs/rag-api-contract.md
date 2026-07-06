> ⚠️ **SUPERSEDED (2026-07)** — Este documento describe el contrato DISEÑADO
> originalmente, que nunca se implementó tal cual. El contrato REAL del
> servicio RAG está en [`DOCUMENTACION_API.md`](./DOCUMENTACION_API.md) y su
> cliente en `src/lib/rag-client.ts`. Se conserva como registro de diseño.

# RAG Service API Contract

**Project**: UPCA App (Universidad / Thesis Project)
**Version**: v1.0 — MVP
**Last updated**: 2026-06-15
**Parties**: Next.js Frontend App (consumer) <-> RAG Service (provider, FastAPI/Python)

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Endpoints](#endpoints)
   - [POST /api/manuals/ingest](#post-apimanualsingest)
   - [POST /api/evaluations/generate](#post-apievaluationsgenerate)
   - [GET /api/manuals/:externalRef/status](#get-apimanualsexternalrefstatus)
5. [Error Codes Reference](#error-codes-reference)
6. [Zod Validation Schemas (TypeScript)](#zod-validation-schemas-typescript)
7. [Versioning and Evolution Notes](#versioning-and-evolution-notes)

---

## Overview

The UPCA App delegates two core responsibilities to an external RAG (Retrieval-Augmented Generation) service:

1. **Manual ingestion** — uploading job function manuals (PDF/Word) so they are chunked, embedded, and indexed for retrieval.
2. **Evaluation generation** — producing Likert-scale evaluation questions tailored to a specific position, grounded in the content of its ingested manual.

Communication is over plain HTTP/REST. The RAG service is a separate process (likely FastAPI/Python) that the Next.js app calls as an internal backend service.

---

## Base URL

| Environment | URL |
|-------------|-----|
| Local development | `http://localhost:8000` |
| Production | TBD — will be configured via `RAG_SERVICE_URL` environment variable |

All endpoint paths below are relative to this base URL.

---

## Authentication

### Current state (local development)

No authentication is required. Both services run on the same machine or private network.

### Production recommendation

Before deploying to any shared or public environment, implement one of the following:

| Method | Description |
|--------|-------------|
| **Shared API Key** (recommended for MVP) | The Next.js app sends a pre-shared secret in the `X-API-Key` header. The RAG service validates it against an environment variable. Simple, sufficient for internal service-to-service communication. |
| **JWT / Service Token** | Issue short-lived tokens via a shared secret. More robust, better for multi-service architectures. Consider this if the system grows beyond two services. |

When implemented, all requests must include:

```
X-API-Key: <shared-secret>
```

Requests without a valid key should receive a `401 Unauthorized` response.

---

## Endpoints

### POST /api/manuals/ingest

Upload a job function manual for RAG processing. The file is chunked, embedded, and indexed so it can be used later for question generation.

**Current behavior**: Synchronous. The app sends the file and waits for the full processing to complete before receiving a response.

**Future behavior**: May become asynchronous. See [Versioning and Evolution Notes](#versioning-and-evolution-notes).

#### Request

| Property | Value |
|----------|-------|
| Content-Type | `multipart/form-data` |
| Method | `POST` |

**Form fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The manual document. Accepted formats: PDF (`.pdf`), Word (`.docx`). |
| `positionName` | string | Yes | Human-readable name of the position (e.g., "Desarrollador Senior"). |
| `positionId` | string | Yes | Unique ID from the Next.js app database. Used for cross-referencing between systems. |

#### Response — Success (200 OK)

```json
{
  "success": true,
  "externalRef": "rag-manual-abc123",
  "chunksCount": 42,
  "message": "Manual processed successfully"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` on success. |
| `externalRef` | string | Unique reference ID assigned by the RAG service. The Next.js app must store this to reference the manual in subsequent calls. |
| `chunksCount` | number | Number of text chunks the manual was split into. Informational. |
| `message` | string | Human-readable confirmation message. |

#### Response — Error (400 / 500)

```json
{
  "success": false,
  "message": "Error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` on error. |
| `message` | string | Human-readable error description. |

---

### POST /api/evaluations/generate

Request generation of Likert-scale evaluation questions for a position, grounded in its previously ingested manual.

#### Request

| Property | Value |
|----------|-------|
| Content-Type | `application/json` |
| Method | `POST` |

**Body**:

```json
{
  "externalRef": "rag-manual-abc123",
  "positionName": "Desarrollador Senior",
  "questionCount": 15
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `externalRef` | string | Yes | — | Reference ID returned by the ingest endpoint. Identifies which manual to use for generation. |
| `positionName` | string | Yes | — | Position name, passed to the LLM prompt for additional context during question generation. |
| `questionCount` | number | No | 10 | Number of questions to generate. Maximum: 20. |

#### Response — Success (200 OK)

```json
{
  "success": true,
  "generationTimeMs": 12450,
  "questions": [
    {
      "text": "El empleado demuestra dominio en las tecnologias requeridas para el cargo"
    },
    {
      "text": "El empleado colabora efectivamente con los miembros de su equipo"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` on success. |
| `generationTimeMs` | number | Wall-clock time in milliseconds that the RAG service took to generate the questions. This metric is captured for the IRTO thesis analysis (response time measurement). |
| `questions` | array | Array of generated question objects. |
| `questions[].text` | string | The evaluation question text, written in Spanish, suitable for a Likert-scale response. |

#### Response — Error (400 / 404 / 500)

```json
{
  "success": false,
  "message": "Manual not found or not yet processed"
}
```

---

### GET /api/manuals/:externalRef/status

Check the processing status of a previously ingested manual. Primarily useful when/if the ingestion endpoint becomes asynchronous.

#### Request

| Property | Value |
|----------|-------|
| Method | `GET` |

**Path parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `externalRef` | string | The reference ID returned by the ingest endpoint. |

#### Response — Success (200 OK)

```json
{
  "status": "ready",
  "message": "Manual indexed with 42 chunks"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | One of: `"processing"`, `"ready"`, `"error"`. |
| `message` | string | Human-readable description of the current state. |

**Status values**:

| Status | Meaning |
|--------|---------|
| `processing` | The manual is currently being chunked/embedded. Not yet available for question generation. |
| `ready` | Processing complete. The manual can be used with the `/api/evaluations/generate` endpoint. |
| `error` | Processing failed. The `message` field contains details. The manual should be re-uploaded. |

#### Response — Error (404)

```json
{
  "success": false,
  "message": "Manual not found"
}
```

---

## Error Codes Reference

| HTTP Status | Meaning | When it occurs |
|-------------|---------|----------------|
| `200` | Success | Request processed correctly. |
| `400` | Bad Request | Missing required fields, invalid file format, `questionCount` exceeds maximum, or malformed JSON. |
| `401` | Unauthorized | Invalid or missing API key (production only). |
| `404` | Not Found | The `externalRef` does not match any known manual. |
| `413` | Payload Too Large | Uploaded file exceeds the size limit (recommended limit: 20 MB). |
| `422` | Unprocessable Entity | File is valid format but content cannot be parsed (e.g., encrypted PDF, corrupted file). |
| `500` | Internal Server Error | Unexpected failure in the RAG service (LLM timeout, embedding service down, etc.). |
| `503` | Service Unavailable | RAG service is overloaded or the underlying LLM provider is unreachable. |

All error responses follow the same shape:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## Zod Validation Schemas (TypeScript)

These schemas should be used in the Next.js app to validate responses from the RAG service at runtime. Place them in the appropriate shared types/validation layer of the project.

```typescript
import { z } from "zod";

// -------------------------------------------------------
// POST /api/manuals/ingest
// -------------------------------------------------------

/** Request is multipart/form-data — validated at the form level, not with Zod. */

export const IngestSuccessResponseSchema = z.object({
  success: z.literal(true),
  externalRef: z.string(),
  chunksCount: z.number().int().nonnegative(),
  message: z.string(),
});

export type IngestSuccessResponse = z.infer<typeof IngestSuccessResponseSchema>;

// -------------------------------------------------------
// POST /api/evaluations/generate
// -------------------------------------------------------

export const GenerateEvaluationRequestSchema = z.object({
  externalRef: z.string().min(1, "externalRef is required"),
  positionName: z.string().min(1, "positionName is required"),
  questionCount: z.number().int().min(1).max(20).optional().default(10),
});

export type GenerateEvaluationRequest = z.infer<typeof GenerateEvaluationRequestSchema>;

export const GeneratedQuestionSchema = z.object({
  text: z.string(),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const GenerateEvaluationSuccessResponseSchema = z.object({
  success: z.literal(true),
  generationTimeMs: z.number().nonnegative(),
  questions: z.array(GeneratedQuestionSchema).min(1),
});

export type GenerateEvaluationSuccessResponse = z.infer<typeof GenerateEvaluationSuccessResponseSchema>;

// -------------------------------------------------------
// GET /api/manuals/:externalRef/status
// -------------------------------------------------------

export const ManualStatusSchema = z.enum(["processing", "ready", "error"]);

export type ManualStatus = z.infer<typeof ManualStatusSchema>;

export const ManualStatusResponseSchema = z.object({
  status: ManualStatusSchema,
  message: z.string(),
});

export type ManualStatusResponse = z.infer<typeof ManualStatusResponseSchema>;

// -------------------------------------------------------
// Shared error response (all endpoints)
// -------------------------------------------------------

export const RagErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type RagErrorResponse = z.infer<typeof RagErrorResponseSchema>;

// -------------------------------------------------------
// Discriminated union helpers
// -------------------------------------------------------

export const IngestResponseSchema = z.discriminatedUnion("success", [
  IngestSuccessResponseSchema,
  RagErrorResponseSchema,
]);

export const GenerateEvaluationResponseSchema = z.discriminatedUnion("success", [
  GenerateEvaluationSuccessResponseSchema,
  RagErrorResponseSchema,
]);
```

---

## Versioning and Evolution Notes

This is the **MVP contract (v1)**. The following changes are anticipated but not yet implemented:

### Async ingestion

The `POST /api/manuals/ingest` endpoint currently blocks until processing completes. For large manuals, this can take significant time. The planned evolution:

1. Ingest returns immediately with `externalRef` and `status: "processing"`.
2. The Next.js app polls `GET /api/manuals/:externalRef/status` until status is `"ready"`.
3. Optionally, the RAG service sends a webhook callback when processing completes.

The `GET /api/manuals/:externalRef/status` endpoint already exists to support this transition. The response shape of the ingest endpoint will change when this is implemented — the `chunksCount` field will move to the status endpoint response.

### Potential future additions

| Change | Description |
|--------|-------------|
| Webhook callbacks | RAG service notifies the Next.js app when async processing completes, instead of requiring polling. |
| Batch generation | Generate evaluations for multiple positions in a single request. |
| Question regeneration | Re-generate specific questions while keeping others, with a feedback loop. |
| Manual versioning | Support updating a manual for an existing position without losing previous evaluation history. |
| Streaming responses | Stream generated questions as they are produced by the LLM, rather than waiting for the full batch. |

### Contract change policy

Any breaking change to this contract (field removals, type changes, semantic changes) must be coordinated between both teams. Non-breaking additions (new optional fields in responses) can be deployed independently.
