"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-middleware";
import { syncPositionAndManual } from "@/lib/position-manual-sync";
import { prisma } from "@/lib/prisma";
import {
  eliminarCargoRAG,
  getCargos,
  guardarCargoRAG,
  obtenerContenidoCargoRAG,
  procesarDocumentoRAG,
} from "@/lib/rag-client";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function procesarDocumento(formData: FormData) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return {
      success: false as const,
      error: "No se recibió un archivo válido",
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") {
    return {
      success: false as const,
      error: "Solo se aceptan archivos PDF o DOCX",
    };
  }

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return {
      success: false as const,
      error: "El archivo debe pesar entre 1 byte y 10 MB",
    };
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { success: false as const, error: "Tipo de archivo no permitido" };
  }

  const ragFormData = new FormData();
  ragFormData.append("file", file, file.name);

  const result = await procesarDocumentoRAG(ragFormData);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  return { success: true as const, data: result.data };
}

export async function guardarCargo(
  nombre_archivo: string,
  contenido_markdown: string,
) {
  const session = await requireAuth({ roles: ["ADMIN", "HR"] });

  const result = await guardarCargoRAG(nombre_archivo, contenido_markdown);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  // Extract cargo name from the markdown frontmatter or filename
  const cargoMatch = contenido_markdown.match(/^cargo:\s*["']?(.+?)["']?\s*$/m);
  const cargoName =
    cargoMatch?.[1] ?? nombre_archivo.replace(".md", "").replace(/_/g, " ");

  // Sync: ensure Position + PROCESSED Manual exist in our DB.
  // RAG save already succeeded — DB failure is a REPORTABLE partial success,
  // NOT a silent swallow.
  let syncWarning: string | undefined;
  try {
    await syncPositionAndManual({
      cargoName,
      fileName: nombre_archivo,
      uploadedById: session.user.id,
    });
  } catch (e) {
    console.error("[KB] Sincronización DB falló tras guardar en RAG:", e);
    syncWarning =
      "Guardado en RAG, pero la sincronización con la base local falló. Usá 'Sincronizar' en Manuales.";
  }

  revalidatePath("/knowledge-base");
  revalidatePath("/manuals");
  revalidatePath("/positions");

  return { success: true as const, data: result.data, warning: syncWarning };
}

export async function obtenerContenidoCargo(cargo: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const result = await obtenerContenidoCargoRAG(cargo);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}

export async function eliminarCargo(cargo: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  // Prevent deletion if there are active/review evaluations
  const activeEvals = await prisma.evaluation.count({
    where: {
      manual: { externalRef: { equals: cargo, mode: "insensitive" } },
      status: { in: ["ACTIVE", "REVIEW"] },
    },
  });

  if (activeEvals > 0) {
    return {
      success: false as const,
      error:
        "No se puede eliminar un cargo con evaluaciones activas o en revisión",
    };
  }

  const result = await eliminarCargoRAG(cargo);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  // Remove Manual record from DB so the cargo is no longer linked.
  // RAG deletion already succeeded — DB failure is a REPORTABLE partial success.
  let syncWarning: string | undefined;
  try {
    await prisma.manual.deleteMany({
      where: { externalRef: { equals: cargo, mode: "insensitive" } },
    });
  } catch (e) {
    console.error("[KB] Eliminación DB falló tras eliminar en RAG:", e);
    syncWarning =
      "Eliminado del RAG, pero la sincronización con la base local falló. Revisá manuales huérfanos.";
  }

  revalidatePath("/knowledge-base");
  revalidatePath("/manuals");
  revalidatePath("/positions");

  return { success: true as const, warning: syncWarning };
}

export async function getKnowledgeBaseCargos() {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const result = await getCargos();
  if (!result.success) return [];
  return result.data.cargos;
}
