import { z } from "zod";

// -------------------------------------------------------
// POST /api/manuals/ingest
// -------------------------------------------------------

export const IngestSuccessResponseSchema = z.object({
  success: z.literal(true),
  externalRef: z.string(),
  chunksCount: z.number().int().nonnegative(),
  message: z.string(),
});

export type IngestSuccessResponse = z.infer<typeof IngestSuccessResponseSchema>;

// -------------------------------------------------------
// GET /api/manuals/:externalRef/status
// -------------------------------------------------------

export const ManualStatusSchema = z.enum(["processing", "ready", "error"]);

export type RagManualStatus = z.infer<typeof ManualStatusSchema>;

export const ManualStatusResponseSchema = z.object({
  status: ManualStatusSchema,
  message: z.string(),
});

export type ManualStatusResponse = z.infer<typeof ManualStatusResponseSchema>;

// -------------------------------------------------------
// Shared error response
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

export type IngestResponse = z.infer<typeof IngestResponseSchema>;

// -------------------------------------------------------
// POST /api/evaluations/generate
// -------------------------------------------------------

export const GeneratedQuestionSchema = z.object({
  text: z.string(),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const GenerateEvaluationSuccessResponseSchema = z.object({
  success: z.literal(true),
  generationTimeMs: z.number().nonnegative(),
  questions: z.array(GeneratedQuestionSchema).min(1),
});

export type GenerateEvaluationSuccessResponse = z.infer<
  typeof GenerateEvaluationSuccessResponseSchema
>;

export const GenerateEvaluationResponseSchema = z.discriminatedUnion("success", [
  GenerateEvaluationSuccessResponseSchema,
  RagErrorResponseSchema,
]);

export type GenerateEvaluationResponse = z.infer<
  typeof GenerateEvaluationResponseSchema
>;
