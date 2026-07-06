import { z } from "zod";

export const createPositionSchema = z.object({
  name: z
    .string()
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { error: "El nombre debe tener como máximo 100 caracteres" }),
  description: z
    .string()
    .max(500, { error: "La descripción debe tener como máximo 500 caracteres" })
    .optional(),
  department: z
    .string()
    .max(100, {
      error: "El departamento debe tener como máximo 100 caracteres",
    })
    .optional(),
});

export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const updatePositionSchema = createPositionSchema.partial().extend({
  id: z.string().min(1, { error: "El ID es requerido" }),
});

export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
