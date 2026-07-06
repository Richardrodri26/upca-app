"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
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
import { ManualStatusBadge } from "./manual-status-badge";

// ────────────────────────────────────────
// Delete button with inline confirmation
// ────────────────────────────────────────

function DeleteButton({
  id,
  onDelete,
}: {
  id: string;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = useCallback(() => {
    if (confirming) {
      onDelete(id);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }, [confirming, id, onDelete]);

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="sm"
      onClick={handleClick}
    >
      {confirming ? "¿Confirmar?" : "Eliminar"}
    </Button>
  );
}

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type ManualRow = {
  id: string;
  fileName: string;
  status: ManualStatus;
  externalRef: string | null;
  position: { id: string; name: string };
  uploadedBy: { id: string; name: string };
  createdAt: Date;
};

// ────────────────────────────────────────
// Columns
// ────────────────────────────────────────

const columnHelper = createColumnHelper<ManualRow>();

function makeColumns(canModify: boolean, onDelete: (id: string) => void) {
  return [
    columnHelper.accessor("fileName", {
      header: "Manual",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("position.name", {
      header: "Cargo",
      cell: (info) => (
        <span className="text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Estado",
      cell: (info) => <ManualStatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor("uploadedBy.name", {
      header: "Subido por",
      cell: (info) => (
        <span className="text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      cell: (info) => {
        if (!canModify) return null;
        const manual = info.row.original;
        return <DeleteButton id={manual.id} onDelete={onDelete} />;
      },
    }),
  ];
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

type ManualsTableProps = {
  data: ManualRow[];
  canModify: boolean;
  onDelete: (id: string) => void;
};

export function ManualsTable({ data, canModify, onDelete }: ManualsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => makeColumns(canModify, onDelete),
    [canModify, onDelete],
  );

  const table = useReactTable({
    data,
    columns,
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
              No se encontraron manuales
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
