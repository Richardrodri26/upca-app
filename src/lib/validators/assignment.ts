import { z } from "zod";

// ────────────────────────────────────────
// Assign evaluation to employees
// ────────────────────────────────────────

export const assignEvaluationSchema = z.object({
  evaluationId: z
    .string()
    .min(1, { error: "El ID de la evaluación es requerido" }),
  pairs: z
    .array(
      z
        .object({
          employeeId: z.string().min(1),
          evaluatorId: z.string().min(1),
        })
        .refine((p) => p.employeeId !== p.evaluatorId, {
          error: "Un empleado no puede evaluarse a sí mismo",
        }),
    )
    .min(1, { error: "Debe agregar al menos un par empleado/evaluador" }),
});

export type AssignEvaluationInput = z.infer<typeof assignEvaluationSchema>;

// ────────────────────────────────────────
// Submit a single Likert response
// ────────────────────────────────────────

export const submitResponseSchema = z.object({
  assignmentId: z
    .string()
    .min(1, { error: "El ID de la asignación es requerido" }),
  questionId: z.string().min(1, { error: "El ID de la pregunta es requerido" }),
  value: z
    .number()
    .int({ error: "Debe ser un número entero" })
    .min(1, { error: "Mínimo 1" })
    .max(5, { error: "Máximo 5" }),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

// ────────────────────────────────────────
// Complete an assignment
// ────────────────────────────────────────

export const completeAssignmentSchema = z.object({
  assignmentId: z
    .string()
    .min(1, { error: "El ID de la asignación es requerido" }),
});

export type CompleteAssignmentInput = z.infer<typeof completeAssignmentSchema>;
