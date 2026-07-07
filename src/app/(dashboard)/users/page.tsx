"use client";

import { useForm } from "@tanstack/react-form";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { FieldError } from "@/components/atoms/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useAllUsers,
  useCreateUser,
  useSetUserRole,
} from "@/features/users/queries";
import {
  type CreateUserInput,
  createUserSchema,
  USER_ROLES,
  type UserRole,
} from "@/lib/validators/user";

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
  const createUserMutation = useCreateUser();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
    } as CreateUserInput,
    validators: {
      onChange: createUserSchema,
    },
    onSubmit: async ({ value }) => {
      setCreateError(null);
      const result = await createUserMutation.mutateAsync(value);
      if (result.ok) {
        setStatus({ ok: true, message: "Usuario creado" });
        setCreateOpen(false);
      } else {
        setCreateError(result.error);
      }
    },
  });

  const handleRoleChange = async (userId: string, role: UserRole) => {
    const result = await setRoleMutation.mutateAsync({ userId, role });
    if (result.ok) {
      setStatus({ ok: true, message: "Rol actualizado correctamente" });
    } else {
      setStatus({ ok: false, message: result.error });
    }
  };

  const handleCreateOpenChange = (open: boolean) => {
    if (open) {
      form.reset();
      setCreateError(null);
    }
    setCreateOpen(open);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger render={<Button>Crear Usuario</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
              <DialogDescription>
                Crea una cuenta con rol. Comparte la contraseña con la persona
                fuera de la aplicación.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="flex flex-col gap-4"
            >
              <form.Field name="name">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Nombre</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      placeholder="Nombre completo"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      placeholder="usuario@upca.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <form.Field name="role">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Rol</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => {
                        if (v) field.handleChange(v as UserRole);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {ROLE_LABELS[field.state.value]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Contraseña inicial</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              {createError ? (
                <p className="text-sm text-destructive">{createError}</p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creando..." : "Crear usuario"}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
