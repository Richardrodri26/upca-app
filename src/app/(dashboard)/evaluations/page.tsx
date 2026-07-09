"use client";

import Link from "next/link";
import { useState } from "react";
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
import { EvaluationStatusBadge } from "@/features/evaluations/components/evaluation-status-badge";
import { useEvaluations } from "@/features/evaluations/queries";
import type { EvaluationStatus } from "@/generated/prisma/client";

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "REVIEW", label: "En Revisión" },
  { value: "ACTIVE", label: "Activas" },
  { value: "CLOSED", label: "Cerradas" },
];

export default function EvaluationsPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string>("all");
  const statusFilter =
    status === "all" ? undefined : (status as EvaluationStatus);

  const { data: evaluations = [], isLoading } = useEvaluations(statusFilter);

  // Role guard
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para ver evaluaciones
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Evaluaciones</h1>
        <Link
          href="/evaluations/generate"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Generar Nueva
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-16 text-center">
          Cargando evaluaciones...
        </div>
      ) : evaluations.length === 0 ? (
        <div className="text-muted-foreground py-16 text-center flex flex-col items-center gap-4">
          <p>No hay evaluaciones todavía</p>
          <Link
            href="/evaluations/generate"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Generar la primera
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: full table with sticky first column */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sticky>Título</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Preguntas</TableHead>
                  <TableHead className="w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((eval_) => (
                  <TableRow key={eval_.id}>
                    <TableCell className="font-medium" sticky>
                      {eval_.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {eval_.position?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <EvaluationStatusBadge status={eval_.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {eval_._count?.questions ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {eval_.status === "REVIEW" && (
                          <Link
                            href={`/evaluations/${eval_.id}/review`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 px-3"
                          >
                            Revisar
                          </Link>
                        )}
                        {(eval_.status === "ACTIVE" ||
                          eval_.status === "CLOSED") && (
                          <Link
                            href={`/evaluations/${eval_.id}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 px-3"
                          >
                            Ver
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: card list fallback */}
          <div className="flex flex-col gap-3 md:hidden">
            {evaluations.map((eval_) => (
              <div
                key={eval_.id}
                className="rounded-lg border p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{eval_.title}</span>
                  <EvaluationStatusBadge status={eval_.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {eval_.position?.name ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {eval_._count?.questions ?? "—"} preguntas
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {eval_.status === "REVIEW" && (
                    <Link
                      href={`/evaluations/${eval_.id}/review`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border hover:bg-accent hover:text-accent-foreground h-9 px-3"
                    >
                      Revisar
                    </Link>
                  )}
                  {(eval_.status === "ACTIVE" || eval_.status === "CLOSED") && (
                    <Link
                      href={`/evaluations/${eval_.id}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border hover:bg-accent hover:text-accent-foreground h-9 px-3"
                    >
                      Ver
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
