import { z } from "zod";

// ────────────────────────────────────────
// Generate
// ────────────────────────────────────────

export const generateEvaluationSchema = z.object({
  positionId: z.string().min(1, { error: "El ID del cargo es requerido" }),
  enfoque: z.string().optional(),
});

export type GenerateEvaluationInput = z.infer<typeof generateEvaluationSchema>;

// ────────────────────────────────────────
// Create
// ────────────────────────────────────────

export const createEvaluationSchema = z.object({
  title: z
    .string()
    .min(5, { error: "El título debe tener al menos 5 caracteres" })
    .max(200, { error: "El título debe tener como máximo 200 caracteres" }),
  positionId: z.string().min(1, { error: "El ID del cargo es requerido" }),
  manualId: z.string().min(1, { error: "El ID del manual es requerido" }),
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

// ────────────────────────────────────────
// Question — update text or status independently
// ────────────────────────────────────────

export const updateQuestionTextSchema = z.object({
  id: z.string().min(1, { error: "El ID de la pregunta es requerido" }),
  text: z
    .string()
    .min(10, { error: "El texto debe tener al menos 10 caracteres" })
    .max(500, { error: "El texto debe tener como máximo 500 caracteres" }),
});

export type UpdateQuestionTextInput = z.infer<typeof updateQuestionTextSchema>;

export const updateQuestionStatusSchema = z.object({
  id: z.string().min(1, { error: "El ID de la pregunta es requerido" }),
  status: z.enum(["APPROVED", "REJECTED"], { error: "Estado inválido" }),
});

export type UpdateQuestionStatusInput = z.infer<
  typeof updateQuestionStatusSchema
>;

// ────────────────────────────────────────
// Question — rate on 3 IAP dimensions
// ────────────────────────────────────────

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

// ────────────────────────────────────────
// Activate / Close
// ────────────────────────────────────────

export const activateEvaluationSchema = z.object({
  evaluationId: z
    .string()
    .min(1, { error: "El ID de la evaluación es requerido" }),
});

export type ActivateEvaluationInput = z.infer<typeof activateEvaluationSchema>;
