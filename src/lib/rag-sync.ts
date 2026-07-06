import { syncPositionAndManual } from "@/lib/position-manual-sync";
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
    const r = await syncPositionAndManual({
      cargoName: cargo,
      fileName: cargo,
      uploadedById: systemUser.id,
    });
    synced++;
    if (r.createdPosition) created++;
  }

  // Note: `created` now counts created POSITIONS (the honest number per plan
  // 008 — a "new" cargo means a Position that didn't exist case-insensitively).
  // The previous semantics counted created Manuals; the only consumer of these
  // counters is this log + `syncManualsWithRag`'s return, whose UI caller
  // (`manuals-page-client.tsx`) discards the result entirely.
  console.log(`[RAG Sync] ${synced} cargos sincronizados, ${created} nuevos`);
  return { synced, created };
}
