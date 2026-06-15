import { useQuery } from "@tanstack/react-query";
import { getManuals, getPositionsWithoutManual, refreshManualStatus } from "./actions";
import type { ManualStatus } from "@/generated/prisma/client";

export function usePositionsWithoutManual() {
  return useQuery({
    queryKey: ["manuals", "positions-without-manual"],
    queryFn: () => getPositionsWithoutManual(),
  });
}

export function useManuals(status?: ManualStatus) {
  return useQuery({
    queryKey: ["manuals", { status }],
    queryFn: () => getManuals(status),
  });
}

export function useManualStatus(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["manuals", id, "status"],
    queryFn: () => refreshManualStatus(id),
    enabled,
    refetchInterval: 5000,
  });
}
