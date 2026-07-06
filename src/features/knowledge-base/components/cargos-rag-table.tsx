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

type CargoRow = {
  name: string;
  isLinked: boolean;
};

function DeleteButton({
  cargo,
  onDelete,
}: {
  cargo: string;
  onDelete: (cargo: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = useCallback(() => {
    if (confirming) {
      onDelete(cargo);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }, [confirming, cargo, onDelete]);

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

const columnHelper = createColumnHelper<CargoRow>();

function makeColumns(
  canModify: boolean,
  onView: (cargo: string) => void,
  onDelete: (cargo: string) => void,
) {
  return [
    columnHelper.accessor("name", {
      header: "Cargo",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("isLinked", {
      header: "Estado",
      cell: (info) =>
        info.getValue() ? (
          <Badge variant="default">Vinculado al sistema</Badge>
        ) : (
          <Badge variant="secondary">Solo en RAG</Badge>
        ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      cell: (info) => {
        const cargo = info.row.original.name;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onView(cargo)}>
              Ver / Editar
            </Button>
            {canModify && <DeleteButton cargo={cargo} onDelete={onDelete} />}
          </div>
        );
      },
    }),
  ];
}

type CargosRagTableProps = {
  data: CargoRow[];
  canModify: boolean;
  onView: (cargo: string) => void;
  onDelete: (cargo: string) => void;
};

export function CargosRagTable({
  data,
  canModify,
  onView,
  onDelete,
}: CargosRagTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => makeColumns(canModify, onView, onDelete),
    [canModify, onView, onDelete],
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
              No hay cargos indexados en el sistema RAG
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

export type { CargoRow };
