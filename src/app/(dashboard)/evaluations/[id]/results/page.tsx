"use client";

import Link from "next/link";
import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";
import { AssignmentStatusBadge } from "@/features/assignments/components/assignment-status-badge";
import { useSession } from "@/features/auth/hooks/use-session";
import { useEvaluationResults } from "@/features/results/queries";
import { downloadResultsXlsx } from "@/features/results/utils/export-xlsx";
import { metricColor } from "@/features/results/utils/iap";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function EvaluationResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data: results, isLoading, error } = useEvaluationResults(id);

  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para ver resultados
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargando resultados...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Error al cargar los resultados
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Evaluación no encontrada
      </div>
    );
  }

  const iapColor = metricColor(results.iap);
  const irtoColor = metricColor(results.irto);

  const handleExport = () => {
    if (!results) return;
    downloadResultsXlsx(results);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {results.evaluation.title}
          </h1>
          <p className="text-muted-foreground">
            {results.evaluation.positionName}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!results}
          title="Exportar a Excel"
          className="self-start sm:self-auto"
        >
          Exportar a Excel
        </Button>
      </div>

      {/* Stats cards */}
      <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Puntaje Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {results.overallAverageScore.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {results.completedCount} completadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex cursor-default items-center gap-1">
                    IAP <Info className="size-3.5 opacity-50" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex flex-col items-start gap-1">
                  <p className="font-semibold">Índice de Adecuación de Preguntas</p>
                  <p>% de preguntas donde el promedio de pertinencia + coherencia + adecuación ≥ 4.0</p>
                  <p className="font-mono opacity-75">(adecuadas / total calificadas) × 100</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums">{results.iap}%</p>
              <Badge variant={iapColor}>
                {results.iapRatedCount} de {results.questions.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex cursor-default items-center gap-1">
                    IRTO <Info className="size-3.5 opacity-50" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex flex-col items-start gap-1">
                  <p className="font-semibold">Índice de Reducción de Tiempo Operativo</p>
                  <p>Compara el tiempo de generación de la IA contra una línea base manual estimada de {results.irtoManualMinutes} min</p>
                  <p className="font-mono opacity-75">((base_manual − tiempo_IA) / base_manual) × 100</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums">
                {results.evaluation.generationTime != null
                  ? `${results.irto}%`
                  : "—"}
              </p>
              <Badge variant={irtoColor}>Reducción</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {results.evaluation.generationTime != null
                ? `${results.evaluation.generationTime! < 60 ? `${Math.round(results.evaluation.generationTime!)} seg` : `${Math.round(results.evaluation.generationTime! / 60)} min`} IA vs ${results.irtoManualMinutes} min manual`
                : "No disponible"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Asignaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {results.totalAssignments}
            </p>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
      </div>
      </TooltipProvider>

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados por empleado</CardTitle>
        </CardHeader>
        <CardContent>
          {results.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay asignaciones
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sticky>Empleado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead>Completado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium" sticky>
                      <Link
                        href={`/evaluations/${id}/results/${a.employee.id}`}
                        className="hover:underline"
                      >
                        {a.employee.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AssignmentStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {a.score != null ? a.score.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {a.completedAt
                        ? new Date(a.completedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
