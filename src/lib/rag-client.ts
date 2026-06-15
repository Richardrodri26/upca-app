import {
  IngestResponseSchema,
  ManualStatusResponseSchema,
  GenerateEvaluationResponseSchema,
  type IngestResponse,
  type ManualStatusResponse,
  type GenerateEvaluationResponse,
} from "@/lib/validators/rag";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8000";
const MOCK_RAG = process.env.MOCK_RAG === "true";

type Result<T> = { success: true; data: T } | { success: false; error: string };

/**
 * Upload a manual file to the RAG service for ingestion.
 * When MOCK_RAG=true, returns a fake successful response.
 */
export async function ingestManual(
  file: File,
  positionName: string,
  positionId: string,
): Promise<Result<{ externalRef: string }>> {
  if (MOCK_RAG) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      data: {
        externalRef: `mock-ref-${Date.now()}`,
      },
    };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("positionName", positionName);
    formData.append("positionId", positionId);

    const response = await fetch(`${RAG_SERVICE_URL}/api/manuals/ingest`, {
      method: "POST",
      body: formData,
    });

    const json = await response.json();
    const parsed = IngestResponseSchema.safeParse(json);

    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }

    if (!parsed.data.success) {
      return { success: false, error: parsed.data.message };
    }

    return {
      success: true,
      data: {
        externalRef: parsed.data.externalRef,
      },
    };
  } catch {
    return { success: false, error: "No se pudo conectar con el servicio RAG" };
  }
}

/**
 * Check the processing status of a previously ingested manual.
 * When MOCK_RAG=true, always returns "ready".
 */
export async function getManualStatus(
  externalRef: string,
): Promise<Result<ManualStatusResponse>> {
  if (MOCK_RAG) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        status: "ready",
        message: "Manual indexed with 42 chunks (mock)",
      },
    };
  }

  try {
    const response = await fetch(
      `${RAG_SERVICE_URL}/api/manuals/${encodeURIComponent(externalRef)}/status`,
      { method: "GET" },
    );

    if (!response.ok) {
      return { success: false, error: "Manual no encontrado en el servicio RAG" };
    }

    const json = await response.json();
    const parsed = ManualStatusResponseSchema.safeParse(json);

    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }

    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "No se pudo conectar con el servicio RAG" };
  }
}

// ────────────────────────────────────────
// Mock questions for development
// ────────────────────────────────────────

const MOCK_QUESTIONS = [
  "El empleado demuestra conocimiento técnico adecuado para las funciones del cargo",
  "Cumple con los plazos establecidos para la entrega de tareas asignadas",
  "Colabora efectivamente con los miembros de su equipo de trabajo",
  "Mantiene una comunicación clara y profesional con sus superiores",
  "Identifica y propone mejoras en los procesos de su área",
  "Se adapta con facilidad a cambios en las prioridades del proyecto",
  "Demuestra iniciativa para resolver problemas sin necesidad de supervisión constante",
  "Mantiene actualizados sus conocimientos técnicos mediante capacitación continua",
  "Documenta adecuadamente su trabajo para facilitar el mantenimiento futuro",
  "Participa activamente en las reuniones de equipo aportando ideas relevantes",
  "Gestiona eficientemente los recursos asignados a sus tareas",
  "Demuestra capacidad para priorizar tareas según su impacto en el negocio",
  "Aplica las mejores prácticas de seguridad en el desarrollo de software",
  "Realiza revisiones de código constructivas que mejoran la calidad del producto",
  "Mantiene una actitud positiva y profesional incluso bajo presión",
];

function getRandomQuestions(count: number): { text: string }[] {
  const shuffled = [...MOCK_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((text) => ({ text }));
}

/**
 * Request the RAG service to generate Likert-scale evaluation questions
 * for a position based on its previously ingested manual.
 * When MOCK_RAG=true, returns realistic fake questions.
 */
export async function generateEvaluation(
  externalRef: string,
  positionName: string,
  questionCount = 15,
): Promise<
  Result<{ generationTimeMs: number; questions: { text: string }[] }>
> {
  if (MOCK_RAG) {
    const delay = 1500 + Math.random() * 1500; // 1.5-3s simulated delay
    await new Promise((resolve) => setTimeout(resolve, delay));
    const generationTimeMs = 8000 + Math.random() * 7000; // 8-15s fake generation time
    return {
      success: true,
      data: {
        generationTimeMs: Math.round(generationTimeMs),
        questions: getRandomQuestions(questionCount),
      },
    };
  }

  try {
    const response = await fetch(
      `${RAG_SERVICE_URL}/api/evaluations/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalRef,
          positionName,
          questionCount,
        }),
      },
    );

    const json = await response.json();
    const parsed = GenerateEvaluationResponseSchema.safeParse(json);

    if (!parsed.success) {
      return {
        success: false,
        error: "Respuesta inesperada del servicio RAG",
      };
    }

    if (!parsed.data.success) {
      return { success: false, error: parsed.data.message };
    }

    return {
      success: true,
      data: {
        generationTimeMs: parsed.data.generationTimeMs,
        questions: parsed.data.questions,
      },
    };
  } catch {
    return {
      success: false,
      error: "No se pudo conectar con el servicio RAG",
    };
  }
}
