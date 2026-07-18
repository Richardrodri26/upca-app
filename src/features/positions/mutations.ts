import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPosition,
  deletePosition,
  setPositionLeader,
  updatePosition,
} from "./actions";

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePosition,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["positions", variables.id] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useSetPositionLeader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      positionId,
      leaderId,
    }: {
      positionId: string;
      leaderId: string | null;
    }) => setPositionLeader(positionId, leaderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({
        queryKey: ["positions", variables.positionId],
      });
    },
  });
}
