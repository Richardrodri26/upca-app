"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/features/auth/hooks/use-session";
import { EvaluationStatusBadge } from "@/features/evaluations/components/evaluation-status-badge";
import {
  useCloseEvaluation,
  useEvaluation,
} from "@/features/evaluations/queries";

export default function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const { data: evaluation, isLoading } = useEvaluation(id);
  const closeEval = useCloseEvaluation();

  const isHrOrAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "HR";

  if (!isHrOrAdmin) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para ver esta evaluación
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargando evaluación...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Evaluación no encontrada
      </div>
    );
  }

  const questions = evaluation.questions ?? [];
  const approvedCount = questions.filter(
    (q) => q.status === "APPROVED" || q.status === "EDITED",
  ).length;

  async function handleClose() {
    await closeEval.mutateAsync(id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {evaluation.title}
            </h1>
            <EvaluationStatusBadge status={evaluation.status} />
          </div>
          <p className="text-muted-foreground">
            {evaluation.position?.name ?? "—"}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          {evaluation.status === "ACTIVE" && (
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={closeEval.isPending}
            >
              {closeEval.isPending ? "Cerrando..." : "Cerrar Evaluación"}
            </Button>
          )}
          <Link
            href="/evaluations"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted hover:text-foreground transition-colors"
          >
            Volver
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preguntas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {questions.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {approvedCount} aprobadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium truncate">
              {evaluation.manual?.fileName ?? "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Creado por
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {evaluation.createdBy?.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(evaluation.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/evaluations/${id}/assignments`}
          className="block rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="font-semibold">Asignaciones</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestionar empleados asignados a esta evaluación
          </p>
        </Link>

        <Link
          href={`/evaluations/${id}/results`}
          className="block rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h2 className="font-semibold">Resultados</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ver puntajes, IAP e IRTO por empleado
          </p>
        </Link>
      </div>
    </div>
  );
}
