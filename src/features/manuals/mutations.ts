import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadManual, deleteManual, refreshManualStatus } from "./actions";

export function useUploadManual() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadManual,
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

export function useRefreshManualStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshManualStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manuals"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}
