"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type User = {
  id: string;
  name: string;
  email: string;
};

type Pair = {
  employee: User;
  evaluator: User;
};

type AssignmentFormProps = {
  users: User[];
  alreadyAssignedEmployeeIds: string[];
  onAssign: (pairs: { employeeId: string; evaluatorId: string }[]) => void;
  isAssigning: boolean;
};

function UserSelect({
  label,
  users,
  value,
  onChange,
}: {
  label: string;
  users: User[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        <span className="mb-1.5 block">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
        >
          <option value="">Seleccionar...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.email}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function EmployeeSelector({
  users,
  alreadyAssignedEmployeeIds,
  onAssign,
  isAssigning,
}: AssignmentFormProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");
  const [pending, setPending] = useState<Pair[]>([]);

  const availableEmployees = users.filter(
    (u) =>
      !alreadyAssignedEmployeeIds.includes(u.id) &&
      !pending.some((p) => p.employee.id === u.id),
  );

  const handleAdd = () => {
    const employee = users.find((u) => u.id === employeeId);
    const evaluator = users.find((u) => u.id === evaluatorId);
    if (!employee || !evaluator) return;
    if (employee.id === evaluator.id) return;
    setPending((prev) => [...prev, { employee, evaluator }]);
    setEmployeeId("");
    setEvaluatorId("");
  };

  const handleRemove = (employeeId: string) => {
    setPending((prev) => prev.filter((p) => p.employee.id !== employeeId));
  };

  const handleSubmit = () => {
    if (pending.length === 0) return;
    onAssign(
      pending.map((p) => ({
        employeeId: p.employee.id,
        evaluatorId: p.evaluator.id,
      })),
    );
    setPending([]);
  };

  const canAdd = !!employeeId && !!evaluatorId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nueva asignación</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UserSelect
            label="Empleado evaluado"
            users={availableEmployees}
            value={employeeId}
            onChange={setEmployeeId}
          />
          <UserSelect
            label="Evaluador (jefe directo)"
            users={users.filter((u) => u.id !== employeeId)}
            value={evaluatorId}
            onChange={setEvaluatorId}
          />
        </div>

        <Button
          variant="outline"
          onClick={handleAdd}
          disabled={!canAdd}
          className="self-start"
        >
          + Agregar par
        </Button>

        {pending.length > 0 && (
          <div className="flex flex-col gap-2 border rounded-md p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Por asignar ({pending.length})
            </p>
            {pending.map((p) => (
              <div
                key={p.employee.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  <span className="font-medium">{p.employee.name}</span>
                  <span className="text-muted-foreground mx-2">
                    evaluado por
                  </span>
                  <span className="font-medium">{p.evaluator.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(p.employee.id)}
                  className="text-muted-foreground hover:text-destructive text-xs"
                >
                  Quitar
                </button>
              </div>
            ))}
            <Button
              onClick={handleSubmit}
              disabled={isAssigning}
              className="mt-1"
            >
              {isAssigning
                ? "Asignando..."
                : `Confirmar ${pending.length} asignación${pending.length !== 1 ? "es" : ""}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
