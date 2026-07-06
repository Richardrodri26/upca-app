import {
  type CargosResponse,
  CargosResponseSchema,
  type ContenidoCargoResponse,
  ContenidoCargoResponseSchema,
  type EliminarCargoResponse,
  EliminarCargoResponseSchema,
  GenerarEvaluacionResponseSchema,
  type GuardarCargoResponse,
  GuardarCargoResponseSchema,
  type ProcesarDocumentoResponse,
  ProcesarDocumentoResponseSchema,
} from "@/lib/validators/rag";

const HF_TOKEN = process.env.HF_TOKEN;

function getRagBaseUrl(): string {
  const url = process.env.RAG_SERVICE_URL;
  if (!url) {
    throw new Error("RAG_SERVICE_URL no está configurada");
  }
  return url;
}

function friendlyConnectionError(e: unknown): string {
  if (e instanceof Error && e.message.includes("RAG_SERVICE_URL")) {
    return e.message;
  }
  if (e instanceof DOMException && e.name === "TimeoutError") {
    return "El servicio RAG tardó demasiado en responder";
  }
  return "No se pudo conectar con el servicio RAG";
}

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
  if (HF_TOKEN) h.Authorization = `Bearer ${HF_TOKEN}`;
  return h;
}

function buildMultipartHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (HF_TOKEN) h.Authorization = `Bearer ${HF_TOKEN}`;
  return h;
}

export async function getCargos(): Promise<Result<CargosResponse>> {
  try {
    const response = await fetch(`${getRagBaseUrl()}/api/cargos`, {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "No se pudo obtener la lista de cargos del servicio RAG",
      };
    }

    const json = await response.json();
    const parsed = CargosResponseSchema.safeParse(json);

    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }

    return { success: true, data: parsed.data };
  } catch (e) {
    return { success: false, error: friendlyConnectionError(e) };
  }
}

export async function generateEvaluation(
  cargo: string,
  enfoque: string,
): Promise<Result<GenerateResult>> {
  try {
    const response = await fetch(`${getRagBaseUrl()}/api/evaluacion/generar`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ cargo, enfoque }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (body as { detail?: string })?.detail ??
          "Error al generar el cuestionario",
      };
    }

    const json = await response.json();

    const parsed = GenerarEvaluacionResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.error(
        "[RAG] Respuesta no coincide con el esquema:",
        parsed.error.flatten().fieldErrors,
      );
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
        generationTimeMs:
          preguntasObj.metadata.tiempo_ejecucion_segundos * 1000,
        questions,
      },
    };
  } catch (e) {
    return { success: false, error: friendlyConnectionError(e) };
  }
}

export async function procesarDocumentoRAG(
  formData: FormData,
): Promise<Result<ProcesarDocumentoResponse>> {
  try {
    const response = await fetch(
      `${getRagBaseUrl()}/api/base_conocimiento/procesar`,
      {
        method: "POST",
        headers: buildMultipartHeaders(),
        body: formData,
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (body as { detail?: string })?.detail ??
          "Error al procesar el documento",
      };
    }

    const json = await response.json();
    const parsed = ProcesarDocumentoResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }
    return { success: true, data: parsed.data };
  } catch (e) {
    return { success: false, error: friendlyConnectionError(e) };
  }
}

export async function guardarCargoRAG(
  nombre_archivo: string,
  contenido_markdown: string,
): Promise<Result<GuardarCargoResponse>> {
  try {
    const response = await fetch(
      `${getRagBaseUrl()}/api/base_conocimiento/guardar`,
      {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ nombre_archivo, contenido_markdown }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (body as { detail?: string })?.detail ?? "Error al guardar el cargo",
      };
    }

    const json = await response.json();
    const parsed = GuardarCargoResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }
    return { success: true, data: parsed.data };
  } catch (e) {
    return { success: false, error: friendlyConnectionError(e) };
  }
}

export async function obtenerContenidoCargoRAG(
  cargo: string,
): Promise<Result<ContenidoCargoResponse>> {
  try {
    const url = new URL(`${getRagBaseUrl()}/api/base_conocimiento/contenido`);
    url.searchParams.set("cargo", cargo);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (body as { detail?: string })?.detail ??
          "Cargo no encontrado en el sistema RAG",
      };
    }

    const json = await response.json();
    const parsed = ContenidoCargoResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }
    return { success: true, data: parsed.data };
  } catch (e) {
    return { success: false, error: friendlyConnectionError(e) };
  }
}

export async function eliminarCargoRAG(
  cargo: string,
): Promise<Result<EliminarCargoResponse>> {
  try {
    const url = new URL(`${getRagBaseUrl()}/api/base_conocimiento/eliminar`);
    url.searchParams.set("cargo", cargo);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: buildHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (body as { detail?: string })?.detail ??
          "Error al eliminar el cargo del sistema RAG",
      };
    }

    const json = await response.json();
    const parsed = EliminarCargoResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: "Respuesta inesperada del servicio RAG" };
    }
    return { success: true, data: parsed.data };
  } catch (e) {
    return { success: false, error: friendlyConnectionError(e) };
  }
}
