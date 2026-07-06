"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-middleware";
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

  // Sync: create Position in our DB if it doesn't exist yet
  let positionId: string | null = null;
  try {
    const existing = await prisma.position.findFirst({
      where: { name: { equals: cargoName, mode: "insensitive" } },
      select: { id: true },
    });

    if (existing) {
      positionId = existing.id;
    } else {
      const created = await prisma.position.create({
        data: { name: cargoName, department: "Sin departamento" },
      });
      positionId = created.id;
    }

    // Create or update Manual record
    const existingManual = await prisma.manual.findFirst({
      where: { positionId },
      select: { id: true },
    });

    if (!existingManual) {
      await prisma.manual.create({
        data: {
          fileName: nombre_archivo,
          positionId,
          uploadedById: session.user.id,
          status: "PROCESSED",
          externalRef: cargoName,
        },
      });
    } else {
      await prisma.manual.update({
        where: { id: existingManual.id },
        data: {
          fileName: nombre_archivo,
          status: "PROCESSED",
          externalRef: cargoName,
        },
      });
    }
  } catch {
    // DB sync is best-effort — RAG save succeeded either way
  }

  revalidatePath("/knowledge-base");
  revalidatePath("/manuals");
  revalidatePath("/positions");

  return { success: true as const, data: result.data };
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

  // Remove Manual record from DB so the cargo is no longer linked
  try {
    await prisma.manual.deleteMany({
      where: { externalRef: { equals: cargo, mode: "insensitive" } },
    });
  } catch {
    // best-effort
  }

  revalidatePath("/knowledge-base");
  revalidatePath("/manuals");
  revalidatePath("/positions");

  return { success: true as const };
}

export async function getKnowledgeBaseCargos() {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const result = await getCargos();
  if (!result.success) return [];
  return result.data.cargos;
}
