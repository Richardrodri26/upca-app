import { useQuery } from "@tanstack/react-query";
import { getManuals, getPositionsWithoutManual } from "./actions";
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
