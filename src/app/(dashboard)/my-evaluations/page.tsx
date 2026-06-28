"use client";

import Link from "next/link";
import { useMyAssignments } from "@/features/assignments/queries";
import { AssignmentStatusBadge } from "@/features/assignments/components/assignment-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MyEvaluationsPage() {
  const { data: assignments = [], isLoading } = useMyAssignments();

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Mis Evaluaciones</h1>

      {assignments.length === 0 ? (
        <div className="text-muted-foreground py-16 text-center">
          <p>No tiene evaluaciones asignadas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">
                    {assignment.evaluation.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {assignment.evaluation.position.name}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">Evaluando a: </span>
                    <span className="font-medium">{assignment.employee.name}</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({assignment.employee.email})
                    </span>
                  </p>
                </div>
                <AssignmentStatusBadge status={assignment.status} />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    {assignment.evaluation._count.questions} preguntas
                  </span>
                  {assignment.score != null && (
                    <span className="font-medium text-foreground">
                      Puntaje: {assignment.score.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {assignment.status === "COMPLETED" ? (
                    <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border text-sm font-medium h-9 px-3 opacity-50">
                      Completada
                    </span>
                  ) : (
                    <Link
                      href={`/my-evaluations/${assignment.id}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                    >
                      {assignment.status === "IN_PROGRESS"
                        ? "Continuar"
                        : "Responder"}
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
