import { z } from "zod";

export const registerManualSchema = z.object({
  positionId: z.string().min(1, { error: "El ID del cargo es requerido" }),
});

export type RegisterManualInput = z.infer<typeof registerManualSchema>;
