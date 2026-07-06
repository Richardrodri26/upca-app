"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignmentStatusBadge } from "@/features/assignments/components/assignment-status-badge";
import { EmployeeSelector } from "@/features/assignments/components/employee-selector";
import {
  useAssignEvaluation,
  useEvaluationAssignments,
  useUsers,
} from "@/features/assignments/queries";
import { useSession } from "@/features/auth/hooks/use-session";
import { getEvaluation } from "@/features/evaluations/actions";

export default function AssignmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();

  const { data: evaluation } = useQuery({
    queryKey: ["evaluations", id],
    queryFn: () => getEvaluation(id),
    enabled: !!id,
  });

  const { data: assignments = [] } = useEvaluationAssignments(id);
  const { data: users = [] } = useUsers();
  const assignMutation = useAssignEvaluation();

  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para gestionar asignaciones
      </div>
    );
  }

  const alreadyAssignedEmployeeIds = assignments.map((a) => a.employeeId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {evaluation?.title ?? "Asignaciones"}
        </h1>
        <p className="text-muted-foreground">
          {evaluation?.position?.name ?? ""}
        </p>
      </div>

      <EmployeeSelector
        users={users}
        alreadyAssignedEmployeeIds={alreadyAssignedEmployeeIds}
        onAssign={(pairs) => assignMutation.mutate({ evaluationId: id, pairs })}
        isAssigning={assignMutation.isPending}
      />

      {assignMutation.data && (
        <p className="text-sm text-muted-foreground">
          {assignMutation.data.created} asignación
          {assignMutation.data.created !== 1 ? "es" : ""} creada
          {assignMutation.data.created !== 1 ? "s" : ""}
          {(assignMutation.data?.skipped ?? 0) > 0 &&
            `, ${assignMutation.data.skipped} ya existían`}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asignaciones actuales</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay asignaciones para esta evaluación
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado evaluado</TableHead>
                  <TableHead>Evaluador</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Puntaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.employee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.employee.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.evaluator.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.evaluator.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AssignmentStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {a.score != null ? a.score.toFixed(1) : "—"}
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
