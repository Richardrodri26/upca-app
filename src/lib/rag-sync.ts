import { prisma } from "@/lib/prisma";
import { getCargos } from "@/lib/rag-client";

export type SyncResult = { synced: number; created: number };

export async function syncWithRag(): Promise<SyncResult | null> {
  const result = await getCargos();

  if (!result.success) {
    console.warn("[RAG Sync] No disponible:", result.error);
    return null;
  }

  const { cargos } = result.data;
  if (cargos.length === 0) return { synced: 0, created: 0 };

  const systemUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "HR"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!systemUser) {
    console.warn(
      "[RAG Sync] No hay usuario ADMIN/HR para asignar los manuales",
    );
    return null;
  }

  let synced = 0;
  let created = 0;

  for (const cargo of cargos) {
    const position = await prisma.position.upsert({
      where: { name: cargo },
      create: { name: cargo },
      update: {},
      include: { manual: true },
    });

    synced++;

    if (!position.manual) {
      await prisma.manual.create({
        data: {
          fileName: cargo,
          positionId: position.id,
          uploadedById: systemUser.id,
          status: "PROCESSED",
          externalRef: cargo,
        },
      });
      created++;
    }
  }

  console.log(`[RAG Sync] ${synced} cargos sincronizados, ${created} nuevos`);
  return { synced, created };
}
