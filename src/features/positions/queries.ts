import { useQuery } from "@tanstack/react-query";
import { getDepartments, getPosition, getPositions } from "./actions";

export function usePositions(search?: string, department?: string) {
  return useQuery({
    queryKey: ["positions", { search, department }],
    queryFn: () => getPositions(search, department),
  });
}

export function usePosition(id: string) {
  return useQuery({
    queryKey: ["positions", id],
    queryFn: () => getPosition(id),
    enabled: !!id,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["positions", "departments"],
    queryFn: () => getDepartments(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
