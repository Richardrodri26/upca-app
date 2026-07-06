"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/hooks/use-session";
import { getKnowledgeBaseCargos } from "../actions";
import { useEliminarCargo, useGuardarCargo } from "../mutations";
import { type CargoRow, CargosRagTable } from "./cargos-rag-table";
import { UploadCargoDialog } from "./upload-cargo-dialog";
import { ViewEditCargoDialog } from "./view-edit-cargo-dialog";

type KnowledgeBasePageClientProps = {
  initialCargos: string[];
  linkedCargos: Set<string>;
};

export function KnowledgeBasePageClient({
  initialCargos,
  linkedCargos,
}: KnowledgeBasePageClientProps) {
  const { data: session } = useSession();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewCargo, setViewCargo] = useState<string | null>(null);

  const canModify =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const { data: cargosNames = initialCargos } = useQuery({
    queryKey: ["knowledge-base", "cargos"],
    queryFn: () => getKnowledgeBaseCargos(),
    initialData: initialCargos,
    staleTime: 30 * 1000,
  });

  const tableData: CargoRow[] = cargosNames.map((name) => ({
    name,
    isLinked: linkedCargos.has(name.toLowerCase()),
  }));

  const guardarMutation = useGuardarCargo();
  const eliminarMutation = useEliminarCargo();

  const handleSave = useCallback(
    async (nombre_archivo: string, contenido_markdown: string) => {
      const result = await guardarMutation.mutateAsync({
        nombre_archivo,
        contenido_markdown,
      });
      return {
        success: result.success,
        error: result.success ? undefined : result.error,
      };
    },
    [guardarMutation],
  );

  const handleDelete = useCallback(
    async (cargo: string) => {
      await eliminarMutation.mutateAsync(cargo);
    },
    [eliminarMutation],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Base de Conocimientos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cargos indexados en el sistema RAG ({cargosNames.length})
          </p>
        </div>
        {canModify && (
          <Button onClick={() => setUploadOpen(true)}>Agregar Cargo</Button>
        )}
      </div>

      <CargosRagTable
        data={tableData}
        canModify={canModify}
        onView={setViewCargo}
        onDelete={handleDelete}
      />

      <UploadCargoDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSave={handleSave}
      />

      <ViewEditCargoDialog
        cargo={viewCargo}
        onOpenChange={(open) => {
          if (!open) setViewCargo(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
