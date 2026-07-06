import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eliminarCargo, guardarCargo } from "./actions";

export function useGuardarCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      nombre_archivo,
      contenido_markdown,
    }: {
      nombre_archivo: string;
      contenido_markdown: string;
    }) => guardarCargo(nombre_archivo, contenido_markdown),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["manuals"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}

export function useEliminarCargo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cargo: string) => eliminarCargo(cargo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["manuals"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });
}
