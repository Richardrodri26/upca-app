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

const primaryCta =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-transform duration-150 active:scale-[0.96]";

const secondaryLink =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 px-3 transition-colors duration-150 active:scale-[0.96]";

export default function EvaluationsPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string>("all");
  const statusFilter =
    status === "all" ? undefined : (status as EvaluationStatus);

  const { data: evaluations = [], isLoading } = useEvaluations(statusFilter);

  if (
    session?.user?.role !== "ADMIN" &&
    session?.user?.role !== "HR" &&
    session?.user?.role !== "AREA_LEAD"
  ) {
    return (
      <div className="w-full">
        <p className="text-muted-foreground text-pretty py-16 text-center">
          No tiene permisos para ver evaluaciones
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-balance text-2xl font-bold tracking-tight">
            Evaluaciones
          </h1>
          <p className="text-muted-foreground text-pretty text-sm">
            Genera y gestiona evaluaciones de desempeño por cargo.
          </p>
        </div>
        <Link href="/evaluations/generate" className={primaryCta}>
          Generar Nueva
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="w-full sm:w-48">
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
        {!isLoading && evaluations.length > 0 && (
          <p className="text-muted-foreground tabular-nums text-sm">
            {evaluations.length}{" "}
            {evaluations.length === 1 ? "evaluación" : "evaluaciones"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed py-16">
          <p className="text-muted-foreground text-center">
            Cargando evaluaciones...
          </p>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16">
          <p className="text-muted-foreground text-pretty text-center">
            No hay evaluaciones todavía
          </p>
          <Link href="/evaluations/generate" className={primaryCta}>
            Generar la primera
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sticky>Título</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-20 text-right">Preguntas</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
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
                    <TableCell className="text-muted-foreground tabular-nums text-right">
                      {eval_._count?.questions ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {eval_.status === "REVIEW" && (
                          <Link
                            href={`/evaluations/${eval_.id}/review`}
                            className={secondaryLink}
                          >
                            Revisar
                          </Link>
                        )}
                        {(eval_.status === "ACTIVE" ||
                          eval_.status === "CLOSED") && (
                          <Link
                            href={`/evaluations/${eval_.id}`}
                            className={secondaryLink}
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
          </div>

          <div className="flex flex-col gap-4 md:hidden">
            {evaluations.map((eval_) => (
              <div
                key={eval_.id}
                className="flex flex-col gap-3 rounded-xl border p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-pretty">{eval_.title}</span>
                  <EvaluationStatusBadge status={eval_.status} />
                </div>
                <p className="text-muted-foreground text-pretty text-sm">
                  {eval_.position?.name ?? "—"}
                </p>
                <p className="text-muted-foreground tabular-nums text-sm">
                  {eval_._count?.questions ?? "—"} preguntas
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {eval_.status === "REVIEW" && (
                    <Link
                      href={`/evaluations/${eval_.id}/review`}
                      className={secondaryLink}
                    >
                      Revisar
                    </Link>
                  )}
                  {(eval_.status === "ACTIVE" || eval_.status === "CLOSED") && (
                    <Link
                      href={`/evaluations/${eval_.id}`}
                      className={secondaryLink}
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
