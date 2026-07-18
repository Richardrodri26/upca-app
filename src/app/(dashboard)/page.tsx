"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyAssignments } from "@/features/assignments/queries";
import { useSession } from "@/features/auth/hooks/use-session";
import { EvaluationStatusBadge } from "@/features/evaluations/components/evaluation-status-badge";
import { useEvaluations } from "@/features/evaluations/queries";
import {
  useDashboardStats,
  useEmployeeDashboardStats,
} from "@/features/results/queries";
import { metricColor } from "@/features/results/utils/iap";

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role === "ADMIN" || role === "HR") {
    return <HRDashboard />;
  }

  return <EmployeeDashboard />;
}

// ────────────────────────────────────────
// HR/ADMIN Dashboard
// ────────────────────────────────────────

function HRDashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: evaluations = [] } = useEvaluations();

  const recentEvals = evaluations.slice(0, 5);
  const iapColor = stats ? metricColor(stats.averageIAP) : "default";

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-balance text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Resumen general del sistema de evaluación
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Evaluaciones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">
              {isLoading ? "—" : (stats?.activeEvaluations ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manuales Procesados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">
              {isLoading ? "—" : (stats?.processedManuals ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empleados Evaluados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">
              {isLoading ? "—" : (stats?.evaluatedEmployees ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              IAP Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tabular-nums">
                {isLoading ? "—" : `${stats?.averageIAP ?? 0}%`}
              </p>
              {stats && (
                <Badge variant={iapColor}>
                  <span className="tabular-nums">{stats.ratedQuestions}</span>{" "}
                  calificadas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluaciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvals.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16">
              <p className="text-pretty text-center text-sm text-muted-foreground">
                No hay evaluaciones todavía
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-40">Cargo</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvals.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.position?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <EvaluationStatusBadge status={e.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/evaluations/${e.id}/results`}
                        className="text-sm text-primary transition-transform duration-150 hover:underline active:scale-[0.96]"
                      >
                        Resultados
                      </Link>
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

// ────────────────────────────────────────
// Employee Dashboard
// ────────────────────────────────────────

function EmployeeDashboard() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = useEmployeeDashboardStats();
  const { data: assignments = [] } = useMyAssignments();

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-balance text-2xl font-bold tracking-tight">
          Bienvenido, {session?.user?.name ?? "Empleado"}
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Tus evaluaciones asignadas
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">
              {isLoading ? "—" : (stats?.pendingCount ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">
              {isLoading ? "—" : (stats?.completedCount ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="[--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Puntaje Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">
              {isLoading ? "—" : (stats?.averageScore.toFixed(1) ?? "—")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis Evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16">
              <p className="text-pretty text-center text-sm text-muted-foreground">
                No tiene evaluaciones asignadas
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {assignments.slice(0, 5).map((a) => {
                const statusLabel =
                  a.status === "COMPLETED"
                    ? "Completada"
                    : a.status === "IN_PROGRESS"
                      ? "En progreso"
                      : "Pendiente";

                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {a.evaluation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.evaluation.position.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          a.status === "COMPLETED"
                            ? "default"
                            : a.status === "IN_PROGRESS"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {statusLabel}
                      </Badge>
                      {a.score != null && (
                        <span className="text-sm font-medium tabular-nums">
                          {a.score.toFixed(1)}
                        </span>
                      )}
                      <Link
                        href={`/my-evaluations/${a.id}`}
                        className="text-xs text-primary transition-transform duration-150 hover:underline active:scale-[0.96]"
                      >
                        {a.status === "COMPLETED" ? "Ver" : "Responder"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
