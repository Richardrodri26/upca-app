"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
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
      <span className="text-muted-foreground">
        {info.getValue() ?? "—"}
      </span>
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
      <span className="text-muted-foreground">
        {info.getValue().length}
      </span>
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
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} colSpan={header.colSpan}>
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
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
