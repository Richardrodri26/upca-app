"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { getPositionsWithProcessedManual } from "@/features/evaluations/actions";
import { useGenerateEvaluation } from "@/features/evaluations/queries";

const DEFAULT_ENFOQUE = "Desempeño general de funciones y responsabilidades";

export default function GenerateEvaluationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [positionId, setPositionId] = useState("");
  const [enfoque, setEnfoque] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: positions = [] } = useQuery({
    queryKey: ["evaluations", "positions-with-processed-manual"],
    queryFn: () => getPositionsWithProcessedManual(),
  });

  const mutation = useGenerateEvaluation();

  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "HR") {
    return (
      <div className="text-muted-foreground py-16 text-center">
        No tiene permisos para generar evaluaciones
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!positionId) {
      setError("Seleccione un cargo");
      return;
    }
    setError(null);

    const result = await mutation.mutateAsync({ positionId, enfoque });

    if (result.success && result.evaluationId) {
      router.push(`/evaluations/${result.evaluationId}/review`);
    } else {
      setError(result.error ?? "Error al generar la evaluación");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Generar Evaluación
        </h1>
        <p className="text-muted-foreground">
          Seleccione un cargo y defina el enfoque para generar preguntas con IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            El agente generará preguntas en escala Likert basadas en el manual
            del cargo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label>Cargo</Label>
            <Select
              value={positionId}
              onValueChange={(v) => {
                if (v) setPositionId(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un cargo">
                  {positions.find((p) => p.id === positionId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {positions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay cargos registrados en el sistema RAG. Registrá un manual
                primero.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Enfoque de la evaluación</Label>
            <Textarea
              value={enfoque}
              onChange={(e) => setEnfoque(e.target.value)}
              placeholder={DEFAULT_ENFOQUE}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Define el pilar o área que el agente priorizará al
              generar las preguntas.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleGenerate}
            disabled={mutation.isPending || positions.length === 0}
            className="w-full"
          >
            {mutation.isPending ? "Generando con IA..." : "Generar con IA"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
