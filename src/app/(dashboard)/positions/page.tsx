import { getDepartments, getPositions } from "@/features/positions/actions";
import { PositionsPageClient } from "@/features/positions/components/positions-page-client";
import type { ManualStatus } from "@/generated/prisma/client";
import { positionsCache } from "@/lib/search-params";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { search, department } = positionsCache.parse(params);

  const [positions, departments] = await Promise.all([
    getPositions(
      search || undefined,
      department === "all" ? undefined : department,
    ),
    getDepartments(),
  ]);

  // Cast to match the client component's expected type
  const typedPositions = positions as unknown as {
    id: string;
    name: string;
    department: string | null;
    manual: { id: string; status: ManualStatus } | null;
    evaluations: { id: string; status: string }[];
  }[];

  return (
    <PositionsPageClient
      initialPositions={typedPositions}
      departments={departments}
    />
  );
}
