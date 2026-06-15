import { getManuals } from "@/features/manuals/actions";
import { ManualsPageClient } from "@/features/manuals/components/manuals-page-client";
import { manualsCache } from "@/lib/search-params";
import type { ManualStatus } from "@/generated/prisma/client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ManualsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { status } = manualsCache.parse(params);

  const statusFilter =
    status === "all" || !status ? undefined : (status as ManualStatus);

  const manuals = await getManuals(statusFilter);

  const typedManuals = manuals as unknown as {
    id: string;
    fileName: string;
    status: ManualStatus;
    externalRef: string | null;
    position: { id: string; name: string };
    uploadedBy: { id: string; name: string };
    createdAt: Date;
  }[];

  return <ManualsPageClient initialManuals={typedManuals} />;
}
