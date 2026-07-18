/**
 * IAP — Índice de Adecuación de Preguntas
 *
 * Mide el porcentaje de preguntas generadas por IA que fueron consideradas
 * "adecuadas" por HR (promedio de las 3 dimensiones >= 4.0).
 *
 * Tesis: Evalúa la calidad del output del sistema RAG.
 */
export function calculateIAP(
  consensuses: {
    relevanceRating: number;
    coherenceRating: number;
    adequacyRating: number;
  }[],
): { iap: number; ratedCount: number; totalCount: number } {
  const totalCount = consensuses.length;

  if (totalCount === 0) {
    return { iap: 0, ratedCount: 0, totalCount: 0 };
  }

  const adequateCount = consensuses.filter((c) => {
    const avg = (c.relevanceRating + c.coherenceRating + c.adequacyRating) / 3;
    return avg >= 4.0;
  }).length;

  const iap = Math.round((adequateCount / totalCount) * 100);

  return {
    iap,
    ratedCount: totalCount,
    totalCount,
  };
}

/**
 * IRTO — Índice de Reducción de Tiempo Operativo
 *
 * Compara el tiempo que tomó la IA en generar una evaluación contra
 * el tiempo estimado que tomaría hacerlo manualmente.
 *
 * Tesis: Cuantifica la eficiencia operativa del sistema automatizado.
 *
 * @param generationTimeSeconds — Tiempo de generación del RAG en segundos
 * @param manualBaselineMinutes — Tiempo estimado manual en minutos (default: 120)
 */
export function calculateIRTO(
  generationTimeSeconds: number,
  manualBaselineMinutes = 120,
): {
  irto: number;
  generationMinutes: number;
  manualBaselineMinutes: number;
} {
  if (generationTimeSeconds <= 0) {
    return {
      irto: 0,
      generationMinutes: 0,
      manualBaselineMinutes,
    };
  }

  const generationMinutes = generationTimeSeconds / 60;
  const irto = Math.round(
    ((manualBaselineMinutes - generationMinutes) / manualBaselineMinutes) * 100,
  );

  return {
    irto: Math.max(0, Math.min(100, irto)),
    generationMinutes,
    manualBaselineMinutes,
  };
}

/**
 * Color coding helper shared across components.
 */
export function metricColor(
  value: number,
): "default" | "destructive" | "secondary" {
  if (value >= 80) return "default";
  if (value >= 60) return "secondary";
  return "destructive";
}
