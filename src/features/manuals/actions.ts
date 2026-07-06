"use server";

import { revalidatePath } from "next/cache";
import type { ManualStatus } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getCargos } from "@/lib/rag-client";

export async function getPositionsWithoutManual() {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const positions = await prisma.position.findMany({
    where: { manual: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return positions;
}

export async function getManuals(status?: ManualStatus) {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const where = status ? { status } : {};

  const manuals = await prisma.manual.findMany({
    where,
    include: {
      position: {
        select: { id: true, name: true },
      },
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return manuals;
}

export async function registerManual(positionId: string) {
  const session = await requireAuth({ roles: ["ADMIN", "HR"] });

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { name: true },
  });

  if (!position) return { success: false, error: "Cargo no encontrado" };

  let manualId: string;
  try {
    const manual = await prisma.manual.create({
      data: {
        fileName: position.name,
        positionId,
        uploadedById: session.user.id,
        status: "PENDING",
      },
    });
    manualId = manual.id;
  } catch {
    return { success: false, error: "El cargo ya tiene un manual registrado" };
  }

  const result = await getCargos();

  if (!result.success) {
    await prisma.manual.update({
      where: { id: manualId },
      data: { status: "ERROR" },
    });
    revalidatePath("/manuals");
    return { success: false, error: result.error };
  }

  const exists = result.data.cargos.some(
    (c) => c.toLowerCase() === position.name.toLowerCase(),
  );

  if (!exists) {
    await prisma.manual.update({
      where: { id: manualId },
      data: { status: "ERROR" },
    });
    revalidatePath("/manuals");
    return {
      success: false,
      error: `"${position.name}" no está indexado en el sistema RAG. Cargos disponibles: ${result.data.cargos.join(", ")}`,
    };
  }

  await prisma.manual.update({
    where: { id: manualId },
    data: { status: "PROCESSED", externalRef: position.name },
  });

  revalidatePath("/manuals");
  revalidatePath("/positions");
  return { success: true };
}

export async function syncManualsWithRag() {
  await requireAuth({ roles: ["ADMIN", "HR"] });
  const { syncWithRag } = await import("@/lib/rag-sync");
  const result = await syncWithRag();
  if (!result)
    return { success: false, error: "No se pudo conectar con el servicio RAG" };
  revalidatePath("/manuals");
  revalidatePath("/positions");
  return { success: true, data: result };
}

export async function deleteManual(id: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  try {
    const evaluations = await prisma.evaluation.count({
      where: {
        manualId: id,
        status: { in: ["ACTIVE", "REVIEW"] },
      },
    });

    if (evaluations > 0) {
      return {
        success: false,
        error:
          "No se puede eliminar un manual con evaluaciones activas o en revisión",
      };
    }

    await prisma.manual.delete({ where: { id } });
    revalidatePath("/manuals");
    revalidatePath("/positions");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo eliminar el manual" };
  }
}
