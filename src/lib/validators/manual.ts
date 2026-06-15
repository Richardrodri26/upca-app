import { z } from "zod";

export const uploadManualSchema = z.object({
  positionId: z.string().min(1, { error: "El ID del cargo es requerido" }),
  fileName: z.string().min(1, { error: "El nombre del archivo es requerido" }),
});

export type UploadManualInput = z.infer<typeof uploadManualSchema>;

export const ingestManualSchema = z.object({
  manualId: z.string().min(1, { error: "El ID del manual es requerido" }),
});

export type IngestManualInput = z.infer<typeof ingestManualSchema>;
