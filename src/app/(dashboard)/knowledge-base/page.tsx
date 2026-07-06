import { getKnowledgeBaseCargos } from "@/features/knowledge-base/actions";
import { KnowledgeBasePageClient } from "@/features/knowledge-base/components/knowledge-base-page-client";
import { prisma } from "@/lib/prisma";

export default async function KnowledgeBasePage() {
  const [cargos, manuals] = await Promise.all([
    getKnowledgeBaseCargos(),
    prisma.manual.findMany({
      where: { status: "PROCESSED", externalRef: { not: null } },
      select: { externalRef: true },
    }),
  ]);

  const linkedCargos = new Set(
    manuals
      .map((m) => m.externalRef?.toLowerCase())
      .filter(Boolean) as string[],
  );

  return (
    <KnowledgeBasePageClient
      initialCargos={cargos}
      linkedCargos={linkedCargos}
    />
  );
}
