"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Employee = {
  id: string;
  name: string;
  email: string;
};

type EmployeeSelectorProps = {
  employees: Employee[];
  alreadyAssigned: string[];
  onAssign: (employeeIds: string[]) => void;
  isAssigning: boolean;
};

export function EmployeeSelector({
  employees,
  alreadyAssigned,
  onAssign,
  isAssigning,
}: EmployeeSelectorProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = () => {
    if (selected.size === 0) return;
    onAssign(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Asignar a empleados</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No se encontraron empleados
            </p>
          ) : (
            filtered.map((emp) => {
              const isAssigned = alreadyAssigned.includes(emp.id);
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 py-1"
                >
                  <Checkbox
                    id={`emp-${emp.id}`}
                    checked={selected.has(emp.id)}
                    onCheckedChange={() => toggle(emp.id)}
                    disabled={isAssigned}
                  />
                  <Label
                    htmlFor={`emp-${emp.id}`}
                    className={`flex-1 cursor-pointer ${isAssigned ? "text-muted-foreground" : ""}`}
                  >
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      {emp.email}
                    </span>
                    {isAssigned && (
                      <span className="text-xs text-muted-foreground ml-2">
                        — Ya asignado
                      </span>
                    )}
                  </Label>
                </div>
              );
            })
          )}
        </div>

        <Button
          onClick={handleAssign}
          disabled={selected.size === 0 || isAssigning}
        >
          {isAssigning
            ? "Asignando..."
            : `Asignar evaluación (${selected.size})`}
        </Button>
      </CardContent>
    </Card>
  );
}
