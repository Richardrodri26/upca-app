import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerManual, deleteManual, syncManualsWithRag } from "./actions";

export function useRegisterManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manuals"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useSyncWithRag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncManualsWithRag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manuals"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useDeleteManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManual,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manuals"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}
