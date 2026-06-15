import { z } from "zod";

// ────────────────────────────────────────
// Assign evaluation to employees
// ────────────────────────────────────────

export const assignEvaluationSchema = z.object({
  evaluationId: z.string().min(1, { error: "El ID de la evaluación es requerido" }),
  employeeIds: z
    .array(z.string().min(1))
    .min(1, { error: "Debe seleccionar al menos un empleado" }),
});

export type AssignEvaluationInput = z.infer<typeof assignEvaluationSchema>;

// ────────────────────────────────────────
// Submit a single Likert response
// ────────────────────────────────────────

export const submitResponseSchema = z.object({
  assignmentId: z.string().min(1, { error: "El ID de la asignación es requerido" }),
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
  assignmentId: z.string().min(1, { error: "El ID de la asignación es requerido" }),
});

export type CompleteAssignmentInput = z.infer<typeof completeAssignmentSchema>;
