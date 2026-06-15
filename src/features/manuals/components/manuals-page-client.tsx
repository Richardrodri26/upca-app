"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/hooks/use-session";
import { useTableState } from "@/hooks/use-table-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManualsTable, type ManualRow } from "./manuals-table";
import { UploadDialog } from "./upload-dialog";
import { getManuals, getPositionsWithoutManual } from "../actions";
import {
  useUploadManual,
  useDeleteManual,
  useRefreshManualStatus,
} from "../mutations";
import type { ManualStatus } from "@/generated/prisma/client";

type ManualsPageClientProps = {
  initialManuals: ManualRow[];
};

export function ManualsPageClient({ initialManuals }: ManualsPageClientProps) {
  const { data: session } = useSession();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Table state via nuqs (URL-persisted) ──
  const { status, setStatus } = useTableState({ statusKey: "status" });

  const statusFilter =
    status === "all" ? undefined : (status as ManualStatus);

  // ── Data fetching with TanStack Query ──
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

  const uploadMutation = useUploadManual();
  const deleteMutation = useDeleteManual();
  const refreshMutation = useRefreshManualStatus();

  const canModify =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const handleDelete = useCallback(
    async (id: string) => {
      if (deleteConfirm === id) {
        await deleteMutation.mutateAsync(id);
        setDeleteConfirm(null);
      } else {
        setDeleteConfirm(id);
      }
    },
    [deleteConfirm, deleteMutation],
  );

  const handleRefresh = useCallback(
    async (id: string) => {
      await refreshMutation.mutateAsync(id);
    },
    [refreshMutation],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Manuales de Funciones
        </h1>
        {canModify && (
          <Button onClick={() => setUploadOpen(true)}>Subir Manual</Button>
        )}
      </div>

      {/* Status filter — synced to URL via nuqs */}
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
            <SelectItem value="PROCESSING">Procesando</SelectItem>
            <SelectItem value="PROCESSED">Procesado</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ManualsTable
        data={manuals}
        canModify={canModify}
        onDelete={handleDelete}
        onRefresh={handleRefresh}
      />

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        positions={positions}
        onUpload={uploadMutation.mutateAsync}
      />
    </div>
  );
}
