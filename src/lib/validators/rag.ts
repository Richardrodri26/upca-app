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

export type GenerarEvaluacionResponse = z.infer<
  typeof GenerarEvaluacionResponseSchema
>;

// ── Base de Conocimiento ───────────────────────────────────────

export const ProcesarDocumentoResponseSchema = z.object({
  cargo_identificado: z.string(),
  archivo_sugerido: z.string(),
  markdown_propuesto: z.string(),
});
export type ProcesarDocumentoResponse = z.infer<
  typeof ProcesarDocumentoResponseSchema
>;

export const GuardarCargoResponseSchema = z.object({
  mensaje: z.string(),
  archivo_guardado: z.string(),
  ruta_completa: z.string(),
});
export type GuardarCargoResponse = z.infer<typeof GuardarCargoResponseSchema>;

export const ContenidoCargoResponseSchema = z.object({
  nombre_archivo: z.string(),
  contenido_markdown: z.string(),
});
export type ContenidoCargoResponse = z.infer<
  typeof ContenidoCargoResponseSchema
>;

export const EliminarCargoResponseSchema = z.object({
  mensaje: z.string(),
  archivo_eliminar: z.string(),
});
export type EliminarCargoResponse = z.infer<typeof EliminarCargoResponseSchema>;
