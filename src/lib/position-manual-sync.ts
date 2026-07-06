import { prisma } from "@/lib/prisma";

/**
 * Ensure a Position and a PROCESSED Manual exist for a RAG cargo.
 *
 * Canonical matching rule: Position.name compared CASE-INSENSITIVELY.
 * This is the ONLY place in the codebase that performs this match —
 * every cargo flow MUST call this helper, never inline its own
 * find-or-create.
 *
 * Throws on DB failure — callers decide how to surface (see
 * `guardarCargo` / `syncWithRag`).
 */
export async function syncPositionAndManual(opts: {
  cargoName: string;
  fileName: string;
  uploadedById: string;
}): Promise<{
  positionId: string;
  manualId: string;
  createdPosition: boolean;
}> {
  const { cargoName, fileName, uploadedById } = opts;

  const existing = await prisma.position.findFirst({
    where: { name: { equals: cargoName, mode: "insensitive" } },
    select: { id: true },
  });

  const position =
    existing ??
    (await prisma.position.create({
      data: { name: cargoName, department: "Sin departamento" },
      select: { id: true },
    }));

  const existingManual = await prisma.manual.findFirst({
    where: { positionId: position.id },
    select: { id: true },
  });

  const manual = existingManual
    ? await prisma.manual.update({
        where: { id: existingManual.id },
        data: { fileName, status: "PROCESSED", externalRef: cargoName },
        select: { id: true },
      })
    : await prisma.manual.create({
        data: {
          fileName,
          positionId: position.id,
          uploadedById,
          status: "PROCESSED",
          externalRef: cargoName,
        },
        select: { id: true },
      });

  return {
    positionId: position.id,
    manualId: manual.id,
    createdPosition: !existing,
  };
}
