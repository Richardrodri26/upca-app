"use client";

import { use } from "react";
import Link from "next/link";
import { useSession } from "@/features/auth/hooks/use-session";
import { useEvaluationResults } from "@/features/results/queries";
import { metricColor } from "@/features/results/utils/iap";
import { AssignmentStatusBadge } from "@/features/assignments/components/assignment-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {results.evaluation.title}
          </h1>
          <p className="text-muted-foreground">
            {results.evaluation.positionName}
          </p>
        </div>
        <Button variant="outline" onClick={() => {}} title="Exportar Resultados">
          Exportar Resultados
        </Button>
      </div>

      {/* Stats cards */}
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
              IAP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tabular-nums">
                {results.iap}%
              </p>
              <Badge variant={iapColor}>
                {results.iapRatedCount} de {results.questions.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              IRTO
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
                ? `${results.irtoGenerationMinutes.toFixed(0)} min IA vs ${results.irtoManualMinutes} min manual`
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
                  <TableHead>Empleado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead>Completado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
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
