"use client";

import { use } from "react";
import { useSession } from "@/features/auth/hooks/use-session";
import { useQuery } from "@tanstack/react-query";
import {
  useEvaluationAssignments,
  useEmployees,
  useAssignEvaluation,
} from "@/features/assignments/queries";
import { getEvaluation } from "@/features/evaluations/actions";
import { EmployeeSelector } from "@/features/assignments/components/employee-selector";
import { AssignmentStatusBadge } from "@/features/assignments/components/assignment-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const { data: employees = [] } = useEmployees();
  const assignMutation = useAssignEvaluation();

  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para gestionar asignaciones
      </div>
    );
  }

  const alreadyAssigned = assignments.map((a) => a.employeeId);

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
        employees={employees}
        alreadyAssigned={alreadyAssigned}
        onAssign={(employeeIds) =>
          assignMutation.mutate({ evaluationId: id, employeeIds })
        }
        isAssigning={assignMutation.isPending}
      />

      {assignMutation.data && (
        <p className="text-sm text-muted-foreground">
          {assignMutation.data.created} asignado
          {assignMutation.data.created !== 1 ? "s" : ""}
          {(assignMutation.data?.skipped ?? 0) > 0 &&
            `, ${assignMutation.data.skipped} ya tenían asignación`}
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
                  <TableHead>Empleado</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Puntaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.employee.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.employee.email}
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
