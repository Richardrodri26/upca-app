import { z } from "zod";

export const CargosResponseSchema = z.object({
  cargos: z.array(z.string()),
});
export type CargosResponse = z.infer<typeof CargosResponseSchema>;

const RagPreguntaSchema = z.object({
  numero: z.number(),
  pilar: z.string(),
  afirmacion: z.string(),
  manual_referencia: z.string(),
  guia_evaluacion_min_max: z.string(),
});

const RagMetadataSchema = z.object({
  proveedor: z.string(),
  modelo: z.string(),
  tiempo_ejecucion_segundos: z.number(),
  tokens_entrada: z.number(),
  tokens_salida: z.number(),
  tokens_totales: z.number(),
});

const RagPreguntasObjectSchema = z.object({
  cargo: z.string(),
  preguntas: z.array(RagPreguntaSchema),
  metadata: RagMetadataSchema,
});

export const GenerarEvaluacionResponseSchema = z.object({
  cargo: z.string(),
  enfoque: z.string(),
  preguntas: RagPreguntasObjectSchema,
});

export type GenerarEvaluacionResponse = z.infer<typeof GenerarEvaluacionResponseSchema>;
