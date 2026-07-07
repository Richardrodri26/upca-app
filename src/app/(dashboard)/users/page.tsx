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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/features/auth/hooks/use-session";
import type { UserRow } from "@/features/users/actions";
import { useAllUsers, useSetUserRole } from "@/features/users/queries";
import { USER_ROLES, type UserRole } from "@/lib/validators/user";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  HR: "RR.HH.",
  EMPLOYEE: "Empleado",
};

const columnHelper = createColumnHelper<UserRow>();

export default function UsersPage() {
  const { data: session } = useSession();
  const { data: users = [], isLoading } = useAllUsers();
  const setRoleMutation = useSetUserRole();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const isAdmin = session?.user?.role === "ADMIN";

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const result = await setRoleMutation.mutateAsync({ userId, role });
    if (result.ok) {
      setStatus({ ok: true, message: "Rol actualizado correctamente" });
    } else {
      setStatus({ ok: false, message: result.error });
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Nombre",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Rol",
        cell: (info) => {
          const row = info.row.original;
          return (
            <Select
              value={row.role}
              onValueChange={(v) => {
                if (v) handleRoleChange(row.id, v as UserRole);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue>{ROLE_LABELS[row.role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Creado",
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue().toLocaleDateString("es-ES")}
          </span>
        ),
      }),
    ],
    // biome-ignore lint/correctness/useExhaustiveDependencies: handleRoleChange is intentionally a plain async function per Plan 005 convention; useCallback refactor deferred (Plan 011 maintenance notes).
    [handleRoleChange],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          No tienes permisos para acceder a esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>

      {status && (
        <p
          className={
            status.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"
          }
        >
          {status.message}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Cargando usuarios...</p>
      ) : (
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
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
      )}
    </div>
  );
}
