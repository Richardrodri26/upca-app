"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { revalidatePath } from "next/cache";
import { ingestManual, getManualStatus } from "@/lib/rag-client";
import type { ManualStatus } from "@/generated/prisma/client";

export async function getPositionsWithoutManual() {
  const positions = await prisma.position.findMany({
    where: { manual: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return positions;
}

export async function getManuals(status?: ManualStatus) {
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

export async function uploadManual(formData: FormData) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  const positionId = formData.get("positionId") as string;
  const file = formData.get("file") as File;

  if (!positionId || !file) {
    return { success: false, error: "Faltan datos requeridos" };
  }

  // Get position name for the RAG service
  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { name: true },
  });

  if (!position) {
    return { success: false, error: "Cargo no encontrado" };
  }

  // Save manual metadata as PENDING
  let manualId: string;
  try {
    const manual = await prisma.manual.create({
      data: {
        fileName: file.name,
        positionId,
        uploadedById: "", // Will be set after auth check
        status: "PENDING",
      },
    });
    manualId = manual.id;
  } catch {
    return { success: false, error: "No se pudo guardar el manual. Verificá que el cargo no tenga ya un manual." };
  }

  // Call RAG ingest
  const result = await ingestManual(file, position.name, positionId);

  if (!result.success) {
    // Update status to ERROR
    await prisma.manual.update({
      where: { id: manualId },
      data: { status: "ERROR" },
    });
    revalidatePath("/manuals");
    return { success: false, error: result.error };
  }

  // Update status to PROCESSING and store externalRef
  await prisma.manual.update({
    where: { id: manualId },
    data: {
      status: "PROCESSING",
      externalRef: result.data.externalRef,
    },
  });

  revalidatePath("/manuals");
  revalidatePath("/positions");
  return { success: true };
}

export async function deleteManual(id: string) {
  await requireAuth({ roles: ["ADMIN", "HR"] });

  try {
    // Check for active evaluations
    const evaluations = await prisma.evaluation.count({
      where: {
        manualId: id,
        status: { in: ["ACTIVE", "REVIEW"] },
      },
    });

    if (evaluations > 0) {
      return {
        success: false,
        error: "No se puede eliminar un manual con evaluaciones activas o en revisión",
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

export async function refreshManualStatus(id: string) {
  const manual = await prisma.manual.findUnique({
    where: { id },
    select: { id: true, externalRef: true, status: true },
  });

  if (!manual || !manual.externalRef) {
    return manual;
  }

  const result = await getManualStatus(manual.externalRef);

  if (!result.success) {
    return manual;
  }

  // Map RAG status to ManualStatus
  const statusMap: Record<string, ManualStatus> = {
    processing: "PROCESSING",
    ready: "PROCESSED",
    error: "ERROR",
  };

  const newStatus = statusMap[result.data.status] ?? manual.status;

  if (newStatus !== manual.status) {
    await prisma.manual.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  return prisma.manual.findUnique({
    where: { id },
    include: {
      position: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });
}
