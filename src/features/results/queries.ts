import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStats,
  getDashboardStatsForEmployee,
  getEvaluationResults,
  getEmployeeResults,
} from "./actions";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEmployeeDashboardStats() {
  return useQuery({
    queryKey: ["employee-dashboard-stats"],
    queryFn: () => getDashboardStatsForEmployee(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEvaluationResults(evaluationId: string) {
  return useQuery({
    queryKey: ["evaluation-results", evaluationId],
    queryFn: () => getEvaluationResults(evaluationId),
    enabled: !!evaluationId,
  });
}

export function useEmployeeResults(evaluationId: string, employeeId: string) {
  return useQuery({
    queryKey: ["employee-results", evaluationId, employeeId],
    queryFn: () => getEmployeeResults(evaluationId, employeeId),
    enabled: !!evaluationId && !!employeeId,
  });
}
