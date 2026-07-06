"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/use-session";
import type { ManualStatus } from "@/generated/prisma/client";
import { useTableState } from "@/hooks/use-table-state";
import { getManuals, getPositionsWithoutManual } from "../actions";
import {
  useDeleteManual,
  useRegisterManual,
  useSyncWithRag,
} from "../mutations";
import { type ManualRow, ManualsTable } from "./manuals-table";
import { UploadDialog } from "./upload-dialog";

type ManualsPageClientProps = {
  initialManuals: ManualRow[];
};

export function ManualsPageClient({ initialManuals }: ManualsPageClientProps) {
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { status, setStatus } = useTableState({ statusKey: "status" });

  const statusFilter = status === "all" ? undefined : (status as ManualStatus);

  const { data: manuals = initialManuals } = useQuery({
    queryKey: ["manuals", { status: statusFilter }],
    queryFn: () => getManuals(statusFilter),
    initialData: initialManuals,
    staleTime: 30 * 1000,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["manuals", "positions-without-manual"],
    queryFn: () => getPositionsWithoutManual(),
    staleTime: 60 * 1000,
  });

  const registerMutation = useRegisterManual();
  const deleteMutation = useDeleteManual();
  const syncMutation = useSyncWithRag();

  const canModify =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Manuales de Funciones
        </h1>
        {canModify && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending
                ? "Sincronizando..."
                : "Sincronizar con RAG"}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              Registrar Manual
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Select
          value={status}
          onValueChange={(v) => {
            if (v) setStatus(v);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="PROCESSED">Procesado</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ManualsTable
        data={manuals}
        canModify={canModify}
        onDelete={handleDelete}
      />

      <UploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        positions={positions}
        onRegister={registerMutation.mutateAsync}
      />
    </div>
  );
}
