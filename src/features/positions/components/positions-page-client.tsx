"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/use-session";
import { useTableState } from "@/hooks/use-table-state";
import { getPositions } from "../actions";
import {
  useCreatePosition,
  useDeletePosition,
  useUpdatePosition,
} from "../mutations";
import { PositionForm } from "./position-form";
import { type PositionRow, PositionsTable } from "./positions-table";

type PositionsPageClientProps = {
  /** Initial data fetched by the server component */
  initialPositions: PositionRow[];
  /** Available departments for the filter */
  departments: string[];
};

export function PositionsPageClient({
  initialPositions,
  departments,
}: PositionsPageClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionRow | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Table state via nuqs (URL-persisted) ──
  const { search, searchInput, setSearchInput, department, setDepartment } =
    useTableState({
      searchKey: "search",
      departmentKey: "department",
    });

  // ── Data fetching with TanStack Query ──
  const { data: positions = initialPositions } = useQuery({
    queryKey: [
      "positions",
      {
        search: search || undefined,
        department: department === "all" ? undefined : department,
      },
    ],
    queryFn: () =>
      getPositions(
        search || undefined,
        department === "all" ? undefined : department,
      ),
    initialData: initialPositions,
    staleTime: 30 * 1000,
  });

  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const canModify =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  const handleEdit = useCallback((position: PositionRow) => {
    setEditingPosition(position);
    setFormOpen(true);
  }, []);

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

  const handleSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      if (editingPosition) {
        return updateMutation.mutateAsync(
          data as Parameters<typeof updateMutation.mutateAsync>[0],
        );
      }
      return createMutation.mutateAsync(
        data as Parameters<typeof createMutation.mutateAsync>[0],
      );
    },
    [editingPosition, createMutation, updateMutation],
  );

  const handleView = useCallback(
    (id: string) => router.push(`/positions/${id}`),
    [router],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cargos</h1>
        {canModify && (
          <Button
            onClick={() => {
              setEditingPosition(null);
              setFormOpen(true);
            }}
          >
            Nuevo Cargo
          </Button>
        )}
      </div>

      {/* Filters — 100% synced to URL via nuqs */}
      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nombre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={department}
          onValueChange={(v) => {
            if (v) setDepartment(v);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PositionsTable
        data={positions}
        canModify={canModify}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PositionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        position={
          editingPosition
            ? {
                id: editingPosition.id,
                name: editingPosition.name,
                description: null,
                department: editingPosition.department,
              }
            : null
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
