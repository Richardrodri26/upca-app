import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EvaluationStatus } from "@/generated/prisma/client";
import {
  activateEvaluation,
  closeEvaluation,
  generateEvaluation,
  getEvaluation,
  getEvaluations,
  getPositionsWithProcessedManual,
  resolveCalibration,
  submitReview,
  updateQuestionStatus,
  updateQuestionText,
} from "./actions";
import type { ConsensusInput, ReviewQuestionInput } from "./validators";

// ── Queries ──

export function useEvaluations(status?: EvaluationStatus) {
  return useQuery({
    queryKey: ["evaluations", { status }],
    queryFn: () => getEvaluations(status),
  });
}

export function useEvaluation(id: string) {
  return useQuery({
    queryKey: ["evaluations", id],
    queryFn: () => getEvaluation(id),
    enabled: !!id,
  });
}

export function usePositionsWithProcessedManual() {
  return useQuery({
    queryKey: ["evaluations", "positions-with-processed-manual"],
    queryFn: () => getPositionsWithProcessedManual(),
    staleTime: 60 * 1000,
  });
}

// ── Mutations ──

export function useGenerateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      positionId,
      enfoque,
    }: {
      positionId: string;
      enfoque?: string;
    }) => generateEvaluation(positionId, enfoque),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useUpdateQuestionText() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      updateQuestionText(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useUpdateQuestionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
    }) => updateQuestionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...ratings
    }: {
      id: string;
    } & ReviewQuestionInput) => submitReview(id, ratings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useResolveCalibration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...consensus
    }: {
      id: string;
    } & ConsensusInput) => resolveCalibration(id, consensus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useActivateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evaluationId: string) => activateEvaluation(evaluationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useCloseEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evaluationId: string) => closeEvaluation(evaluationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}
