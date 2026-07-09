"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManualStatus } from "@/generated/prisma/client";

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type PositionRow = {
  id: string;
  name: string;
  department: string | null;
  manual: { id: string; status: ManualStatus } | null;
  evaluations: { id: string; status: string }[];
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

const statusBadge = (status: ManualStatus) => {
  const map: Record<
    ManualStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    PENDING: { variant: "outline", label: "Pendiente" },
    PROCESSING: { variant: "secondary", label: "Procesando" },
    PROCESSED: { variant: "default", label: "Procesado" },
    ERROR: { variant: "destructive", label: "Error" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
};

// ────────────────────────────────────────
// Columns
// ────────────────────────────────────────

const columnHelper = createColumnHelper<PositionRow>();

const columns = (
  canModify: boolean,
  onView: (id: string) => void,
  onEdit: (position: PositionRow) => void,
  onDelete: (id: string) => void,
) => [
  columnHelper.accessor("name", {
    header: "Nombre",
    cell: (info) => (
      <button
        type="button"
        className="hover:underline text-left font-medium cursor-pointer"
        onClick={() => onView(info.row.original.id)}
      >
        {info.getValue()}
      </button>
    ),
  }),
  columnHelper.accessor("department", {
    header: "Departamento",
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue() ?? "—"}</span>
    ),
  }),
  columnHelper.accessor("manual", {
    header: "Manual",
    cell: (info) => {
      const manual = info.getValue();
      if (!manual) return <Badge variant="outline">Sin manual</Badge>;
      return statusBadge(manual.status);
    },
  }),
  columnHelper.accessor("evaluations", {
    header: "Evaluaciones",
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue().length}</span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Acciones",
    cell: (info) => {
      if (!canModify) return null;
      const position = info.row.original;
      return (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(position)}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(position.id)}
          >
            Eliminar
          </Button>
        </div>
      );
    },
  }),
];

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

type PositionsTableProps = {
  data: PositionRow[];
  canModify: boolean;
  onView: (id: string) => void;
  onEdit: (position: PositionRow) => void;
  onDelete: (id: string) => void;
};

export function PositionsTable({
  data,
  canModify,
  onView,
  onEdit,
  onDelete,
}: PositionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const memoizedColumns = useMemo(
    () => columns(canModify, onView, onEdit, onDelete),
    [canModify, onView, onEdit, onDelete],
  );

  const table = useReactTable({
    data,
    columns: memoizedColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      {/* Desktop / tablet: full table with sticky first column */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    sticky={index === 0}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-1"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc"
                          ? " ▲"
                          : header.column.getIsSorted() === "desc"
                            ? " ▼"
                            : ""}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  No se encontraron cargos
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell key={cell.id} sticky={index === 0}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: card list fallback */}
      <div className="flex flex-col gap-3 md:hidden">
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No se encontraron cargos
          </p>
        ) : (
          data.map((position) => (
            <div
              key={position.id}
              className="rounded-lg border p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left font-medium hover:underline"
                  onClick={() => onView(position.id)}
                >
                  {position.name}
                </button>
                {position.manual ? (
                  statusBadge(position.manual.status)
                ) : (
                  <Badge variant="outline">Sin manual</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {position.department ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {position.evaluations.length} evaluaciones
              </p>
              {canModify && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(position)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(position.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
