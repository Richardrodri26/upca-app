"use client";

import { use } from "react";
import { useEmployeeResults } from "@/features/results/queries";
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

const LIKERT_LABELS = [
  "",
  "Nunca",
  "Raramente",
  "A veces",
  "Frecuentemente",
  "Siempre",
];

export default function EmployeeResultsPage({
  params,
}: {
  params: Promise<{ id: string; employeeId: string }>;
}) {
  const { id: evaluationId, employeeId } = use(params);
  const { data: results, isLoading } = useEmployeeResults(
    evaluationId,
    employeeId,
  );

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        Cargando resultados...
      </div>
    );
  }

  if (!results || "error" in results) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        {results && "error" in results ? results.error : "No encontrado"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {results.assignment.evaluation.title}
      </h1>

      {/* Employee info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {results.assignment.employee.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Cargo:</span>
              <p className="font-medium">
                {results.assignment.evaluation.positionName}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">
                {results.assignment.employee.email}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Puntaje:</span>
              <p className="text-2xl font-bold tabular-nums">
                {results.assignment.score?.toFixed(1) ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Completado:</span>
              <p className="font-medium">
                {results.assignment.completedAt
                  ? new Date(
                      results.assignment.completedAt,
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question-by-question breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Desglose por pregunta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Pregunta</TableHead>
                <TableHead className="w-24 text-center">Respuesta</TableHead>
                <TableHead className="w-24 text-center">
                  Promedio general
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.questions.map((q) => {
                const belowAverage =
                  q.employeeResponse != null &&
                  q.overallAverage != null &&
                  q.overallAverage - q.employeeResponse > 1;

                return (
                  <TableRow key={q.id}>
                    <TableCell className="text-muted-foreground font-bold">
                      {q.order}
                    </TableCell>
                    <TableCell className="text-sm">{q.text}</TableCell>
                    <TableCell className="text-center">
                      {q.employeeResponse != null ? (
                        <span
                          className={`font-medium tabular-nums ${
                            belowAverage ? "text-destructive" : ""
                          }`}
                        >
                          {q.employeeResponse} —{" "}
                          {LIKERT_LABELS[q.employeeResponse]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground tabular-nums">
                      {q.overallAverage != null
                        ? q.overallAverage.toFixed(1)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
