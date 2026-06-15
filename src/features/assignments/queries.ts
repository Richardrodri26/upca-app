import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEvaluationAssignments,
  getMyAssignments,
  getAssignment,
  getEmployees,
  assignEvaluation,
  submitResponse,
  completeAssignment,
} from "./actions";

// ── Queries ──

export function useEvaluationAssignments(evaluationId: string) {
  return useQuery({
    queryKey: ["assignments", evaluationId],
    queryFn: () => getEvaluationAssignments(evaluationId),
    enabled: !!evaluationId,
  });
}

export function useMyAssignments() {
  return useQuery({
    queryKey: ["my-assignments"],
    queryFn: () => getMyAssignments(),
  });
}

export function useAssignment(assignmentId: string) {
  return useQuery({
    queryKey: ["assignments", assignmentId],
    queryFn: () => getAssignment(assignmentId),
    enabled: !!assignmentId,
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees(),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ──

export function useAssignEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluationId,
      employeeIds,
    }: {
      evaluationId: string;
      employeeIds: string[];
    }) => assignEvaluation(evaluationId, employeeIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.evaluationId],
      });
    },
  });
}

export function useSubmitResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      questionId,
      value,
    }: {
      assignmentId: string;
      questionId: string;
      value: number;
    }) => submitResponse(assignmentId, questionId, value),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assignments", variables.assignmentId],
      });
    },
  });
}

export function useCompleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => completeAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}
