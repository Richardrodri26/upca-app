import {
  CargosResponseSchema,
  GenerarEvaluacionResponseSchema,
  type CargosResponse,
} from "@/lib/validators/rag";

const RAG_SERVICE_URL =
  process.env.RAG_SERVICE_URL ?? "https://rafael-0001-agente-rh.hf.space";
const HF_TOKEN = process.env.HF_TOKEN;

type Result<T> = { success: true; data: T } | { success: false; error: string };

type GeneratedQuestion = {
  text: string;
  pillar: string;
  manualReference: string;
  scoringGuide: string;
};

type GenerateResult = {
  generationTimeMs: number;
  questions: GeneratedQuestion[];
};

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (HF_TOKEN) h["Authorization"] = `Bearer ${HF_TOKEN}`;
  return h;
}

export async function getCargos(): Promise<Result<CargosResponse>> {
  try {
    const response = await fetch(`${RAG_SERVICE_URL}/api/cargos`, {
      method: "GET",
      headers: buildHeaders(),
    });

    if (!response.ok) {
      return { success: false, error: "No se pudo obtener la lista de cargos del servicio RAG" };
    }

    const json = await response.json();
    const parsed = CargosResponseSchema.safeParse(json);

    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "No se pudo conectar con el servicio RAG" };
  }
}

export async function generateEvaluation(
  cargo: string,
  enfoque: string,
): Promise<Result<GenerateResult>> {
  try {
    const response = await fetch(`${RAG_SERVICE_URL}/api/evaluacion/generar`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ cargo, enfoque }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (body as { detail?: string })?.detail ?? "Error al generar el cuestionario",
      };
    }

    const json = await response.json();
    console.log("[RAG] Raw response:", JSON.stringify(json, null, 2));

    const parsed = GenerarEvaluacionResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.error("[RAG] Validation error:", parsed.error.flatten());
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }

    const { preguntas: preguntasObj } = parsed.data;

    if (preguntasObj.preguntas.length === 0) {
      return { success: false, error: "El servicio RAG no generó preguntas" };
    }

    const questions: GeneratedQuestion[] = preguntasObj.preguntas.map((p) => ({
      text: p.afirmacion,
      pillar: p.pilar,
      manualReference: p.manual_referencia,
      scoringGuide: p.guia_evaluacion_min_max,
    }));

    return {
      success: true,
      data: {
        generationTimeMs: preguntasObj.metadata.tiempo_ejecucion_segundos * 1000,
        questions,
      },
    };
  } catch {
    return { success: false, error: "No se pudo conectar con el servicio RAG" };
  }
}
